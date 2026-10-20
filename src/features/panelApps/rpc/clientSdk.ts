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

      function sanitizeRelPath(p) {
        var s = String(p || '');
        while (s.charAt(0) === '/' || s.charAt(0) === '\\\\') {
          s = s.slice(1);
        }
        return s;
      }

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
              appId: '${appId}',
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
        getSelectedText: function() {
          return callHost('editor', 'getSelection');
        },
        insert: function(options) {
          var payload = typeof options === 'string' ? { text: options, mode: 'cursor' } : options;
          return callHost('editor', 'insert', payload);
        },
        insertText: function(text) {
          return callHost('editor', 'insert', { text: String(text || ''), mode: 'cursor' });
        },
        insertAtCursor: function(text) {
          return callHost('editor', 'insert', { text: String(text || ''), mode: 'cursor' });
        },
        getActiveDocument: function() {
          return callHost('editor', 'getActiveDocument');
        },
        setSelections: function(selections, mainIndex) {
          return callHost('editor', 'setSelections', { selections: selections, mainIndex: mainIndex });
        },
        getSelections: function() {
          return callHost('editor', 'getSelections');
        },
        fold: function(options) {
          return callHost('editor', 'fold', options || {});
        },
        foldRange: function(line) {
          return callHost('editor', 'foldRange', { line: line });
        },
        unfoldRange: function(line) {
          return callHost('editor', 'unfoldRange', { line: line });
        },
        foldAll: function() {
          return callHost('editor', 'foldAll');
        },
        unfoldAll: function() {
          return callHost('editor', 'unfoldAll');
        },
        setDiagnostics: function(diagnostics) {
          return callHost('editor', 'setDiagnostics', { diagnostics: diagnostics });
        },
        clearDiagnostics: function() {
          return callHost('editor', 'clearDiagnostics');
        },
        replaceRange: function(from, to, text) {
          return callHost('editor', 'replaceRange', { from: from, to: to, text: text });
        }
      };

      window.CNTXT.tabs = {
        list: function() {
          return callHost('tabs', 'list');
        },
        create: function(options) {
          return callHost('tabs', 'create', options);
        },
        openFile: function(filePath, opts) {
          var rawPath = typeof filePath === 'string' ? filePath : (filePath && filePath.filePath ? filePath.filePath : '');
          var cleanPath = sanitizeRelPath(rawPath);
          var parts = cleanPath.split('/');
          var fallbackTitle = parts[parts.length - 1] || 'Document';
          var title = (opts && opts.title) ? opts.title : (typeof filePath === 'object' && filePath.title ? filePath.title : fallbackTitle);
          return window.CNTXT.workspace.readFile(cleanPath).then(function(res) {
            var content = (res && typeof res === 'object' && 'content' in res) ? res.content : String(res || '');
            return callHost('tabs', 'create', {
              title: title,
              content: content,
              filePath: cleanPath,
              language: 'markdown'
            });
          }).catch(function() {
            return callHost('tabs', 'create', {
              title: title,
              content: '',
              filePath: cleanPath,
              language: 'markdown'
            });
          });
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
          var payload = typeof options === 'string' ? { folder: options } : (options || {});
          return callHost('workspace', 'listFiles', payload);
        },
        readFile: function(relativePath) {
          var rawPath = typeof relativePath === 'string' ? relativePath : (relativePath && relativePath.relativePath ? relativePath.relativePath : '');
          var cleanPath = sanitizeRelPath(rawPath);
          var payload = typeof relativePath === 'string' ? { relativePath: cleanPath } : Object.assign({}, relativePath, { relativePath: cleanPath });
          return callHost('workspace', 'readFile', payload).then(function(res) {
            var str = (res && typeof res === 'object' && 'content' in res) ? res.content : String(res || '');
            var wrapped = new String(str);
            wrapped.content = str;
            return wrapped;
          });
        },
        writeFile: function(relativePath, content) {
          var rawPath = typeof relativePath === 'string' ? relativePath : (relativePath && relativePath.relativePath ? relativePath.relativePath : '');
          var cleanPath = sanitizeRelPath(rawPath);
          var payload = typeof relativePath === 'object' ? Object.assign({}, relativePath, { relativePath: cleanPath }) : { relativePath: cleanPath, content: content };
          return callHost('workspace', 'writeFile', payload);
        },
        appendToFile: function(relativePath, content) {
          var rawPath = typeof relativePath === 'string' ? relativePath : (relativePath && relativePath.relativePath ? relativePath.relativePath : '');
          var cleanPath = sanitizeRelPath(rawPath);
          var textToAppend = typeof relativePath === 'object' && relativePath.content !== undefined ? relativePath.content : content;
          var lf = String.fromCharCode(10);
          return window.CNTXT.workspace.readFile(cleanPath).then(function(res) {
            var cur = (res && typeof res === 'object' && 'content' in res) ? res.content : String(res || '');
            var sep = (cur && cur.slice(-1) !== lf) ? lf : '';
            var updated = cur + sep + String(textToAppend || '');
            return window.CNTXT.workspace.writeFile(cleanPath, updated);
          }).catch(function() {
            return window.CNTXT.workspace.writeFile(cleanPath, String(textToAppend || ''));
          });
        },
        createVirtualTab: function(title, content) {
          return callHost('tabs', 'create', {
            title: String(title || 'Document'),
            content: String(content || ''),
            language: 'markdown'
          }).then(function(res) {
            return (res && res.tabId) ? res.tabId : 'tab_' + Date.now();
          });
        },
        getTabContent: function() {
          return callHost('editor', 'getActiveDocument').then(function(doc) {
            return (doc && typeof doc === 'object' && 'content' in doc) ? doc.content : '';
          });
        },
        setTabContent: function(tabId, content) {
          return callHost('editor', 'insert', { text: String(content || ''), mode: 'replace' });
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

      window.CNTXT.terminal = {
        listChannels: function() {
          return callHost('terminal', 'listChannels');
        },
        spawn: function(options) {
          return callHost('terminal', 'spawn', options);
        },
        sendInput: function(channelId, data) {
          var payload = typeof channelId === 'object' ? channelId : { channelId: channelId, data: data };
          return callHost('terminal', 'sendInput', payload);
        },
        kill: function(channelId) {
          var payload = typeof channelId === 'object' ? channelId : { channelId: channelId };
          return callHost('terminal', 'kill', payload);
        }
      };

      var notifyFn = function(options) {
        var payload = typeof options === 'string' ? { type: 'info', message: options } : (options || {});
        if (payload && !payload.message && payload.title) {
          payload.message = payload.title;
        }
        return callHost('notify', 'notify', payload);
      };
      notifyFn.info = function(msg) { return notifyFn({ type: 'info', message: String(msg) }); };
      notifyFn.success = function(msg) { return notifyFn({ type: 'success', message: String(msg) }); };
      notifyFn.warn = function(msg) { return notifyFn({ type: 'warning', message: String(msg) }); };
      notifyFn.error = function(msg) { return notifyFn({ type: 'error', message: String(msg) }); };
      notifyFn.showToast = function(msg, type) { return notifyFn({ type: type || 'info', message: String(msg) }); };
      window.CNTXT.notify = notifyFn;

      window.CNTXT.ui = {
        showToast: function(msg, type) {
          return notifyFn({ type: type || 'info', message: String(msg) });
        }
      };
    })();
  `;
}
