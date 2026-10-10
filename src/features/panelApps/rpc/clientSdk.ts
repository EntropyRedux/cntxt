/**
 * Client SDK Polyfill Generator (FG-16)
 *
 * Constructs the JavaScript snippet injected into panel mini-app sandboxed iframes,
 * providing the typed, Promise-based `window.CNTXT` host command bus interface.
 */

export function buildClientSdkInjection(appId: string): string {
  return `
    (function() {
      var pendingRequests = {};
      var reqCounter = 0;

      // Handle RPC responses from the CNTXT host window
      window.addEventListener('message', function(ev) {
        if (!ev.data || typeof ev.data !== 'object') return;
        if (ev.data.type === 'CNTXT_RPC_RESPONSE' && ev.data.response) {
          var res = ev.data.response;
          var pending = pendingRequests[res.id];
          if (pending) {
            delete pendingRequests[res.id];
            clearTimeout(pending.timer);
            if (res.success) {
              pending.resolve(res.data);
            } else {
              var err = new Error(res.error ? res.error.message : 'RPC call failed');
              if (res.error) err.code = res.error.code;
              pending.reject(err);
            }
          }
        }
      });

      function callHost(domain, action, payload) {
        return new Promise(function(resolve, reject) {
          var reqId = 'req_' + (++reqCounter) + '_' + Date.now();
          var timer = setTimeout(function() {
            if (pendingRequests[reqId]) {
              delete pendingRequests[reqId];
              reject(new Error('RPC call timed out (' + domain + '.' + action + ')'));
            }
          }, 8000);

          pendingRequests[reqId] = {
            resolve: resolve,
            reject: reject,
            timer: timer
          };

          try {
            window.parent.postMessage({
              type: 'CNTXT_RPC_REQUEST',
              request: {
                id: reqId,
                domain: domain,
                action: action,
                appId: '${appId}',
                payload: payload
              }
            }, '*');
          } catch (e) {
            delete pendingRequests[reqId];
            clearTimeout(timer);
            reject(e);
          }
        });
      }

      window.CNTXT = window.CNTXT || {};

      // 1. Core RPC Dispatcher
      window.CNTXT.call = callHost;

      // 2. Ready & State Handshake (Backwards-Compatible with FG-14/15)
      window.CNTXT.ready = function() {
        window.parent.postMessage({ type: 'CNTXT_APP_READY', appId: '${appId}' }, '*');
      };

      window.CNTXT.state = {
        get: function() { return window.__INIT_STATE__; },
        save: function(s) {
          window.__INIT_STATE__ = s;
          window.parent.postMessage({ type: 'CNTXT_STATE_SAVE', state: s, appId: '${appId}' }, '*');
        },
        onInit: function(cb) {
          if (typeof cb !== 'function') return;
          window.addEventListener('message', function(ev) {
            if (ev.data && ev.data.type === 'CNTXT_STATE_INIT') {
              window.__INIT_STATE__ = ev.data.state;
              cb(ev.data.state);
            }
          });
        }
      };

      // 3. Domain API Namespaces
      window.CNTXT.editor = {
        getSelection: function() {
          return callHost('editor', 'getSelection');
        },
        insert: function(options) {
          var payload = typeof options === 'string' ? { text: options, mode: 'cursor' } : options;
          return callHost('editor', 'insert', payload);
        },
        getActiveDocument: function() {
          return callHost('editor', 'getActiveDocument');
        }
      };

      window.CNTXT.tabs = {
        list: function() {
          return callHost('tabs', 'list');
        },
        create: function(options) {
          return callHost('tabs', 'create', options);
        },
        focus: function(tabId) {
          var payload = typeof tabId === 'string' ? { tabId: tabId } : tabId;
          return callHost('tabs', 'focus', payload);
        }
      };

      window.CNTXT.workspace = {
        getInfo: function() {
          return callHost('workspace', 'getInfo');
        },
        listFiles: function(options) {
          return callHost('workspace', 'listFiles', options || {});
        },
        readFile: function(relativePath) {
          var payload = typeof relativePath === 'string' ? { relativePath: relativePath } : relativePath;
          return callHost('workspace', 'readFile', payload);
        },
        writeFile: function(relativePath, content) {
          var payload = typeof relativePath === 'object' ? relativePath : { relativePath: relativePath, content: content };
          return callHost('workspace', 'writeFile', payload);
        }
      };

      window.CNTXT.templates = {
        list: function() {
          return callHost('templates', 'list');
        },
        apply: function(templateId, variables) {
          var payload = typeof templateId === 'object' ? templateId : { templateId: templateId, variables: variables || {} };
          return callHost('templates', 'apply', payload);
        }
      };

      window.CNTXT.actions = {
        list: function() {
          return callHost('actions', 'list');
        },
        execute: function(actionId, input) {
          var payload = typeof actionId === 'object' ? actionId : { actionId: actionId, input: input };
          return callHost('actions', 'execute', payload);
        }
      };

      window.CNTXT.notify = function(options) {
        var payload = typeof options === 'string' ? { type: 'info', message: options } : options;
        return callHost('notify', 'notify', payload);
      };
    })();
  `;
}
