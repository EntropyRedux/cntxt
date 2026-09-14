/**
 * CENTRALIZED THEME ENGINE (theme/index.ts)
 * 
 * Single source of truth for:
 * - Theme definitions and metadata
 * - Design token mappings
 * - CSS custom property values for light and dark themes
 * - Theme application runtime hooks
 */

import { ThemeName } from '../contracts/data_shapes';

export interface ThemeTokens {
  name: ThemeName;
  displayName: string;
  type: 'dark' | 'light';
  colors: {
    appBg: string;
    titlebarBg: string;
    titlebarFg: string;
    titlebarBorder: string;
    tabbarBg: string;
    tabActiveBg: string;
    tabActiveFg: string;
    tabActiveBorder: string;
    tabInactiveBg: string;
    tabInactiveFg: string;
    tabHoverBg: string;
    tabBorder: string;
    editorBg: string;
    editorFg: string;
    activitybarBg: string;
    activitybarFg: string;
    activitybarActiveBg: string;
    activitybarActiveFg: string;
    activitybarHoverBg: string;
    activitybarBorder: string;
    sidebarBg: string;
    sidebarFg: string;
    sidebarHeaderBg: string;
    sidebarBorder: string;
    statusbarBg: string;
    statusbarFg: string;
    statusbarBorder: string;
    cardBg: string;
    cardFg: string;
    cardHoverBg: string;
    cardBorder: string;
    cardSecondaryBg: string;
    inputBg: string;
    inputFg: string;
    inputBorder: string;
    inputFocusBorder: string;
    inputPlaceholder: string;
    modalBg: string;
    modalFg: string;
    modalBorder: string;
    modalHeaderBg: string;
    modalOverlay: string;
    dropdownBg: string;
    dropdownFg: string;
    dropdownHoverBg: string;
    dropdownBorder: string;
    accentPrimary: string;
    accentPrimaryHover: string;
    accentContainer: string;
    onAccentContainer: string;
    accentRing: string;
    borderPrimary: string;
    borderSubtle: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textAccent: string;
    codeblockContainerBg: string;
    codeblockContainerBorder: string;
    codeblockHeaderBg: string;
    codeblockHeaderBorder: string;
    scrollbarThumb: string;
    scrollbarThumbHover: string;
    statusSuccess: string;
    statusWarning: string;
    statusError: string;
    statusInfo: string;
  };
}

export const THEMES: Record<ThemeName, ThemeTokens> = {
  'contextpad-dark': {
    name: 'contextpad-dark',
    displayName: 'ContextPad Dark',
    type: 'dark',
    colors: {
      appBg: '#18181B',
      titlebarBg: '#141417',
      titlebarFg: '#D4D4D8',
      titlebarBorder: '#23232A',
      tabbarBg: '#18181B',
      tabActiveBg: '#1E1E1E',
      tabActiveFg: '#FFFFFF',
      tabActiveBorder: '#007ACC',
      tabInactiveBg: '#141417',
      tabInactiveFg: '#90909A',
      tabHoverBg: '#222228',
      tabBorder: '#2B2B33',
      editorBg: '#1E1E1E',
      editorFg: '#D4D4D4',
      activitybarBg: '#18181B',
      activitybarFg: '#71717A',
      activitybarActiveBg: '#27272F',
      activitybarActiveFg: '#FFFFFF',
      activitybarHoverBg: '#202024',
      activitybarBorder: '#27272F',
      sidebarBg: '#1F1F24',
      sidebarFg: '#D4D4D4',
      sidebarHeaderBg: '#18181B',
      sidebarBorder: '#2B2B30',
      statusbarBg: '#18181B',
      statusbarFg: '#A1A1AA',
      statusbarBorder: '#27272F',
      cardBg: '#25252A',
      cardFg: '#D4D4D4',
      cardHoverBg: '#2E2E36',
      cardBorder: '#2B2B33',
      cardSecondaryBg: '#1E1E22',
      inputBg: '#18181C',
      inputFg: '#D4D4D4',
      inputBorder: '#3C3C44',
      inputFocusBorder: '#007ACC',
      inputPlaceholder: '#71717A',
      modalBg: '#1F1F24',
      modalFg: '#D4D4D8',
      modalBorder: '#33333D',
      modalHeaderBg: '#18181B',
      modalOverlay: 'rgba(0, 0, 0, 0.75)',
      dropdownBg: '#1F1F24',
      dropdownFg: '#D4D4D8',
      dropdownHoverBg: '#007ACC',
      dropdownBorder: '#33333D',
      accentPrimary: '#007ACC',
      accentPrimaryHover: '#0066A6',
      accentContainer: 'rgba(0, 122, 204, 0.15)',
      onAccentContainer: '#38BDF8',
      accentRing: 'rgba(0, 122, 204, 0.35)',
      borderPrimary: '#2B2B33',
      borderSubtle: '#222228',
      textPrimary: '#EDEDED',
      textSecondary: '#A1A1AA',
      textMuted: '#71717A',
      textAccent: '#38BDF8',
      codeblockContainerBg: '#141418',
      codeblockContainerBorder: '#2E2E38',
      codeblockHeaderBg: '#18181E',
      codeblockHeaderBorder: '#272732',
      scrollbarThumb: '#33333A',
      scrollbarThumbHover: '#4F4F5A',
      statusSuccess: '#10B981',
      statusWarning: '#F59E0B',
      statusError: '#EF4444',
      statusInfo: '#38BDF8'
    }
  },

  'google-material-3': {
    name: 'google-material-3',
    displayName: 'Google Material 3 Light',
    type: 'light',
    colors: {
      appBg: '#EDF2FA',
      titlebarBg: '#DFE4EC',
      titlebarFg: '#1F1F1F',
      titlebarBorder: '#CBD2DB',
      tabbarBg: '#E8EEF5',
      tabActiveBg: '#F8F9FA',
      tabActiveFg: '#0B57D0',
      tabActiveBorder: '#0B57D0',
      tabInactiveBg: '#E8EEF5',
      tabInactiveFg: '#444746',
      tabHoverBg: '#DFE4EC',
      tabBorder: '#D3D7DC',
      editorBg: '#F8F9FA',
      editorFg: '#1F1F1F',
      activitybarBg: '#E8EEF5',
      activitybarFg: '#444746',
      activitybarActiveBg: '#D3E3FD',
      activitybarActiveFg: '#041E49',
      activitybarHoverBg: '#DFE4EC',
      activitybarBorder: '#D3D7DC',
      sidebarBg: '#F0F4F9',
      sidebarFg: '#1F1F1F',
      sidebarHeaderBg: '#E8EEF5',
      sidebarBorder: '#D3D7DC',
      statusbarBg: '#F0F4F9',
      statusbarFg: '#444746',
      statusbarBorder: '#D3D7DC',
      cardBg: '#FFFFFF',
      cardFg: '#1F1F1F',
      cardHoverBg: '#EDF2FA',
      cardBorder: '#D3D7DC',
      cardSecondaryBg: '#EDF2FA',
      inputBg: '#FFFFFF',
      inputFg: '#1F1F1F',
      inputBorder: '#747775',
      inputFocusBorder: '#0B57D0',
      inputPlaceholder: '#747775',
      modalBg: '#FFFFFF',
      modalFg: '#1F1F1F',
      modalBorder: '#D3D7DC',
      modalHeaderBg: '#F0F4F9',
      modalOverlay: 'rgba(0, 0, 0, 0.45)',
      dropdownBg: '#FFFFFF',
      dropdownFg: '#1F1F1F',
      dropdownHoverBg: '#D3E3FD',
      dropdownBorder: '#D3D7DC',
      accentPrimary: '#0B57D0',
      accentPrimaryHover: '#0842A0',
      accentContainer: '#D3E3FD',
      onAccentContainer: '#041E49',
      accentRing: 'rgba(11, 87, 208, 0.25)',
      borderPrimary: '#D3D7DC',
      borderSubtle: '#E2E7EE',
      textPrimary: '#1F1F1F',
      textSecondary: '#444746',
      textMuted: '#747775',
      textAccent: '#0B57D0',
      codeblockContainerBg: '#F0F4F9',
      codeblockContainerBorder: '#D3D7DC',
      codeblockHeaderBg: '#E8EEF5',
      codeblockHeaderBorder: '#D3D7DC',
      scrollbarThumb: '#C4C7C5',
      scrollbarThumbHover: '#747775',
      statusSuccess: '#146C2E',
      statusWarning: '#E37400',
      statusError: '#BA1A1A',
      statusInfo: '#0B57D0'
    }
  },

  'parchment': {
    name: 'parchment',
    displayName: 'Parchment Warm Light',
    type: 'light',
    colors: {
      appBg: '#F7F4EB',
      titlebarBg: '#DFD5C2',
      titlebarFg: '#2C2518',
      titlebarBorder: '#D1C4AF',
      tabbarBg: '#EFEAD8',
      tabActiveBg: '#FCFAF2',
      tabActiveFg: '#8C5E24',
      tabActiveBorder: '#8C5E24',
      tabInactiveBg: '#EAE4D0',
      tabInactiveFg: '#6B5E48',
      tabHoverBg: '#E4DCB8',
      tabBorder: '#DDD5BD',
      editorBg: '#FCFAF2',
      editorFg: '#2C2518',
      activitybarBg: '#EAE4D0',
      activitybarFg: '#6B5E48',
      activitybarActiveBg: '#E0D6B8',
      activitybarActiveFg: '#8C5E24',
      activitybarHoverBg: '#E5DCBE',
      activitybarBorder: '#DDD5BD',
      sidebarBg: '#F3EEDC',
      sidebarFg: '#2C2518',
      sidebarHeaderBg: '#EAE4D0',
      sidebarBorder: '#DDD5BD',
      statusbarBg: '#EAE4D0',
      statusbarFg: '#6B5E48',
      statusbarBorder: '#DDD5BD',
      cardBg: '#FCFAF2',
      cardFg: '#2C2518',
      cardHoverBg: '#F0EAD6',
      cardBorder: '#DDD5BD',
      cardSecondaryBg: '#F0EAD6',
      inputBg: '#FCFAF2',
      inputFg: '#2C2518',
      inputBorder: '#DDD5BD',
      inputFocusBorder: '#8C5E24',
      inputPlaceholder: '#8C8068',
      modalBg: '#FCFAF2',
      modalFg: '#2C2518',
      modalBorder: '#DDD5BD',
      modalHeaderBg: '#EFEAD8',
      modalOverlay: 'rgba(44, 37, 24, 0.45)',
      dropdownBg: '#FCFAF2',
      dropdownFg: '#2C2518',
      dropdownHoverBg: '#EFEAD8',
      dropdownBorder: '#DDD5BD',
      accentPrimary: '#8C5E24',
      accentPrimaryHover: '#704B1C',
      accentContainer: 'rgba(140, 94, 36, 0.15)',
      onAccentContainer: '#8C5E24',
      accentRing: 'rgba(140, 94, 36, 0.25)',
      borderPrimary: '#DDD5BD',
      borderSubtle: '#E8E1C8',
      textPrimary: '#2C2518',
      textSecondary: '#6B5E48',
      textMuted: '#8C8068',
      textAccent: '#8C5E24',
      codeblockContainerBg: '#EFEAD8',
      codeblockContainerBorder: '#DDD5BD',
      codeblockHeaderBg: '#EAE4D0',
      codeblockHeaderBorder: '#DDD5BD',
      scrollbarThumb: '#D5CCA8',
      scrollbarThumbHover: '#B5AA82',
      statusSuccess: '#2E7D32',
      statusWarning: '#E65100',
      statusError: '#C62828',
      statusInfo: '#8C5E24'
    }
  },

  'one-dark': {
    name: 'one-dark',
    displayName: 'One Dark Pro',
    type: 'dark',
    colors: {
      appBg: '#21252B',
      titlebarBg: '#1E2227',
      titlebarFg: '#ABB2BF',
      titlebarBorder: '#14161B',
      tabbarBg: '#21252B',
      tabActiveBg: '#282C34',
      tabActiveFg: '#61AFEF',
      tabActiveBorder: '#61AFEF',
      tabInactiveBg: '#21252B',
      tabInactiveFg: '#5C6370',
      tabHoverBg: '#2C313C',
      tabBorder: '#181A1F',
      editorBg: '#282C34',
      editorFg: '#ABB2BF',
      activitybarBg: '#21252B',
      activitybarFg: '#5C6370',
      activitybarActiveBg: '#2C313C',
      activitybarActiveFg: '#61AFEF',
      activitybarHoverBg: '#282C34',
      activitybarBorder: '#181A1F',
      sidebarBg: '#21252B',
      sidebarFg: '#ABB2BF',
      sidebarHeaderBg: '#1E2227',
      sidebarBorder: '#181A1F',
      statusbarBg: '#21252B',
      statusbarFg: '#5C6370',
      statusbarBorder: '#181A1F',
      cardBg: '#282C34',
      cardFg: '#ABB2BF',
      cardHoverBg: '#2C313C',
      cardBorder: '#181A1F',
      cardSecondaryBg: '#21252B',
      inputBg: '#1E2227',
      inputFg: '#ABB2BF',
      inputBorder: '#3E4451',
      inputFocusBorder: '#61AFEF',
      inputPlaceholder: '#5C6370',
      modalBg: '#282C34',
      modalFg: '#ABB2BF',
      modalBorder: '#181A1F',
      modalHeaderBg: '#21252B',
      modalOverlay: 'rgba(0, 0, 0, 0.75)',
      dropdownBg: '#21252B',
      dropdownFg: '#ABB2BF',
      dropdownHoverBg: '#61AFEF',
      dropdownBorder: '#181A1F',
      accentPrimary: '#61AFEF',
      accentPrimaryHover: '#4D8FD1',
      accentContainer: 'rgba(97, 175, 239, 0.15)',
      onAccentContainer: '#61AFEF',
      accentRing: 'rgba(97, 175, 239, 0.35)',
      borderPrimary: '#181A1F',
      borderSubtle: '#2C313C',
      textPrimary: '#ABB2BF',
      textSecondary: '#828997',
      textMuted: '#5C6370',
      textAccent: '#61AFEF',
      codeblockContainerBg: '#1E2227',
      codeblockContainerBorder: '#3E4451',
      codeblockHeaderBg: '#21252B',
      codeblockHeaderBorder: '#3E4451',
      scrollbarThumb: '#3E4451',
      scrollbarThumbHover: '#4B5263',
      statusSuccess: '#98C379',
      statusWarning: '#E5C07B',
      statusError: '#E06C75',
      statusInfo: '#61AFEF'
    }
  },

  'dracula': {
    name: 'dracula',
    displayName: 'Dracula Dark',
    type: 'dark',
    colors: {
      appBg: '#21222C',
      titlebarBg: '#191A21',
      titlebarFg: '#F8F8F2',
      titlebarBorder: '#13141A',
      tabbarBg: '#21222C',
      tabActiveBg: '#282A36',
      tabActiveFg: '#BD93F9',
      tabActiveBorder: '#BD93F9',
      tabInactiveBg: '#1E1F29',
      tabInactiveFg: '#6272A4',
      tabHoverBg: '#44475A',
      tabBorder: '#191A21',
      editorBg: '#282A36',
      editorFg: '#F8F8F2',
      activitybarBg: '#21222C',
      activitybarFg: '#6272A4',
      activitybarActiveBg: '#44475A',
      activitybarActiveFg: '#BD93F9',
      activitybarHoverBg: '#282A36',
      activitybarBorder: '#191A21',
      sidebarBg: '#21222C',
      sidebarFg: '#F8F8F2',
      sidebarHeaderBg: '#191A21',
      sidebarBorder: '#191A21',
      statusbarBg: '#191A21',
      statusbarFg: '#6272A4',
      statusbarBorder: '#191A21',
      cardBg: '#282A36',
      cardFg: '#F8F8F2',
      cardHoverBg: '#44475A',
      cardBorder: '#191A21',
      cardSecondaryBg: '#21222C',
      inputBg: '#191A21',
      inputFg: '#F8F8F2',
      inputBorder: '#6272A4',
      inputFocusBorder: '#BD93F9',
      inputPlaceholder: '#6272A4',
      modalBg: '#282A36',
      modalFg: '#F8F8F2',
      modalBorder: '#6272A4',
      modalHeaderBg: '#191A21',
      modalOverlay: 'rgba(0, 0, 0, 0.75)',
      dropdownBg: '#21222C',
      dropdownFg: '#F8F8F2',
      dropdownHoverBg: '#BD93F9',
      dropdownBorder: '#6272A4',
      accentPrimary: '#BD93F9',
      accentPrimaryHover: '#A770E8',
      accentContainer: 'rgba(189, 147, 249, 0.15)',
      onAccentContainer: '#BD93F9',
      accentRing: 'rgba(189, 147, 249, 0.35)',
      borderPrimary: '#191A21',
      borderSubtle: '#44475A',
      textPrimary: '#F8F8F2',
      textSecondary: '#E2E2DC',
      textMuted: '#6272A4',
      textAccent: '#BD93F9',
      codeblockContainerBg: '#191A21',
      codeblockContainerBorder: '#44475A',
      codeblockHeaderBg: '#21222C',
      codeblockHeaderBorder: '#44475A',
      scrollbarThumb: '#44475A',
      scrollbarThumbHover: '#6272A4',
      statusSuccess: '#50FA7B',
      statusWarning: '#FFB86C',
      statusError: '#FF5555',
      statusInfo: '#8BE9FD'
    }
  },

  'nord': {
    name: 'nord',
    displayName: 'Nord Arctic',
    type: 'dark',
    colors: {
      appBg: '#242933',
      titlebarBg: '#1E222A',
      titlebarFg: '#D8DEE9',
      titlebarBorder: '#16181F',
      tabbarBg: '#242933',
      tabActiveBg: '#2E3440',
      tabActiveFg: '#88C0D0',
      tabActiveBorder: '#88C0D0',
      tabInactiveBg: '#242933',
      tabInactiveFg: '#4C566A',
      tabHoverBg: '#3B4252',
      tabBorder: '#1E222A',
      editorBg: '#2E3440',
      editorFg: '#D8DEE9',
      activitybarBg: '#242933',
      activitybarFg: '#4C566A',
      activitybarActiveBg: '#3B4252',
      activitybarActiveFg: '#88C0D0',
      activitybarHoverBg: '#2E3440',
      activitybarBorder: '#1E222A',
      sidebarBg: '#242933',
      sidebarFg: '#D8DEE9',
      sidebarHeaderBg: '#1E222A',
      sidebarBorder: '#1E222A',
      statusbarBg: '#242933',
      statusbarFg: '#4C566A',
      statusbarBorder: '#1E222A',
      cardBg: '#2E3440',
      cardFg: '#D8DEE9',
      cardHoverBg: '#3B4252',
      cardBorder: '#1E222A',
      cardSecondaryBg: '#242933',
      inputBg: '#1E222A',
      inputFg: '#D8DEE9',
      inputBorder: '#4C566A',
      inputFocusBorder: '#88C0D0',
      inputPlaceholder: '#4C566A',
      modalBg: '#2E3440',
      modalFg: '#D8DEE9',
      modalBorder: '#1E222A',
      modalHeaderBg: '#242933',
      modalOverlay: 'rgba(0, 0, 0, 0.75)',
      dropdownBg: '#242933',
      dropdownFg: '#D8DEE9',
      dropdownHoverBg: '#88C0D0',
      dropdownBorder: '#1E222A',
      accentPrimary: '#88C0D0',
      accentPrimaryHover: '#72A9B9',
      accentContainer: 'rgba(136, 192, 208, 0.15)',
      onAccentContainer: '#88C0D0',
      accentRing: 'rgba(136, 192, 208, 0.35)',
      borderPrimary: '#1E222A',
      borderSubtle: '#3B4252',
      textPrimary: '#ECEFF4',
      textSecondary: '#D8DEE9',
      textMuted: '#4C566A',
      textAccent: '#88C0D0',
      codeblockContainerBg: '#1E222A',
      codeblockContainerBorder: '#3B4252',
      codeblockHeaderBg: '#242933',
      codeblockHeaderBorder: '#3B4252',
      scrollbarThumb: '#3B4252',
      scrollbarThumbHover: '#4C566A',
      statusSuccess: '#A3BE8C',
      statusWarning: '#EBCB8B',
      statusError: '#BF616A',
      statusInfo: '#88C0D0'
    }
  },

  'monokai': {
    name: 'monokai',
    displayName: 'Monokai Classic',
    type: 'dark',
    colors: {
      appBg: '#1E1F1C',
      titlebarBg: '#19181A',
      titlebarFg: '#F8F8F2',
      titlebarBorder: '#121113',
      tabbarBg: '#1E1F1C',
      tabActiveBg: '#272822',
      tabActiveFg: '#A6E22E',
      tabActiveBorder: '#A6E22E',
      tabInactiveBg: '#1E1F1C',
      tabInactiveFg: '#75715E',
      tabHoverBg: '#3E3D32',
      tabBorder: '#141411',
      editorBg: '#272822',
      editorFg: '#F8F8F2',
      activitybarBg: '#1E1F1C',
      activitybarFg: '#75715E',
      activitybarActiveBg: '#3E3D32',
      activitybarActiveFg: '#A6E22E',
      activitybarHoverBg: '#272822',
      activitybarBorder: '#141411',
      sidebarBg: '#1E1F1C',
      sidebarFg: '#F8F8F2',
      sidebarHeaderBg: '#141411',
      sidebarBorder: '#141411',
      statusbarBg: '#1E1F1C',
      statusbarFg: '#75715E',
      statusbarBorder: '#141411',
      cardBg: '#272822',
      cardFg: '#F8F8F2',
      cardHoverBg: '#3E3D32',
      cardBorder: '#141411',
      cardSecondaryBg: '#1E1F1C',
      inputBg: '#141411',
      inputFg: '#F8F8F2',
      inputBorder: '#75715E',
      inputFocusBorder: '#A6E22E',
      inputPlaceholder: '#75715E',
      modalBg: '#272822',
      modalFg: '#F8F8F2',
      modalBorder: '#141411',
      modalHeaderBg: '#1E1F1C',
      modalOverlay: 'rgba(0, 0, 0, 0.75)',
      dropdownBg: '#1E1F1C',
      dropdownFg: '#F8F8F2',
      dropdownHoverBg: '#A6E22E',
      dropdownBorder: '#141411',
      accentPrimary: '#A6E22E',
      accentPrimaryHover: '#8EB427',
      accentContainer: 'rgba(166, 226, 46, 0.15)',
      onAccentContainer: '#A6E22E',
      accentRing: 'rgba(166, 226, 46, 0.35)',
      borderPrimary: '#141411',
      borderSubtle: '#3E3D32',
      textPrimary: '#F8F8F2',
      textSecondary: '#CFCEBE',
      textMuted: '#75715E',
      textAccent: '#A6E22E',
      codeblockContainerBg: '#141411',
      codeblockContainerBorder: '#3E3D32',
      codeblockHeaderBg: '#1E1F1C',
      codeblockHeaderBorder: '#3E3D32',
      scrollbarThumb: '#3E3D32',
      scrollbarThumbHover: '#75715E',
      statusSuccess: '#A6E22E',
      statusWarning: '#E6DB74',
      statusError: '#F92672',
      statusInfo: '#66D9EF'
    }
  },

  'github-dark': {
    name: 'github-dark',
    displayName: 'GitHub Dark',
    type: 'dark',
    colors: {
      appBg: '#0D1117',
      titlebarBg: '#010409',
      titlebarFg: '#C9D1D9',
      titlebarBorder: '#21262D',
      tabbarBg: '#0D1117',
      tabActiveBg: '#161B22',
      tabActiveFg: '#58A6FF',
      tabActiveBorder: '#58A6FF',
      tabInactiveBg: '#0D1117',
      tabInactiveFg: '#8B949E',
      tabHoverBg: '#21262D',
      tabBorder: '#30363D',
      editorBg: '#0D1117',
      editorFg: '#C9D1D9',
      activitybarBg: '#0D1117',
      activitybarFg: '#8B949E',
      activitybarActiveBg: '#21262D',
      activitybarActiveFg: '#58A6FF',
      activitybarHoverBg: '#161B22',
      activitybarBorder: '#30363D',
      sidebarBg: '#0D1117',
      sidebarFg: '#C9D1D9',
      sidebarHeaderBg: '#161B22',
      sidebarBorder: '#30363D',
      statusbarBg: '#0D1117',
      statusbarFg: '#8B949E',
      statusbarBorder: '#30363D',
      cardBg: '#161B22',
      cardFg: '#C9D1D9',
      cardHoverBg: '#21262D',
      cardBorder: '#30363D',
      cardSecondaryBg: '#0D1117',
      inputBg: '#0D1117',
      inputFg: '#C9D1D9',
      inputBorder: '#30363D',
      inputFocusBorder: '#58A6FF',
      inputPlaceholder: '#8B949E',
      modalBg: '#161B22',
      modalFg: '#C9D1D9',
      modalBorder: '#30363D',
      modalHeaderBg: '#0D1117',
      modalOverlay: 'rgba(0, 0, 0, 0.75)',
      dropdownBg: '#161B22',
      dropdownFg: '#C9D1D9',
      dropdownHoverBg: '#58A6FF',
      dropdownBorder: '#30363D',
      accentPrimary: '#58A6FF',
      accentPrimaryHover: '#388BFD',
      accentContainer: 'rgba(88, 166, 255, 0.15)',
      onAccentContainer: '#58A6FF',
      accentRing: 'rgba(88, 166, 255, 0.35)',
      borderPrimary: '#30363D',
      borderSubtle: '#21262D',
      textPrimary: '#C9D1D9',
      textSecondary: '#8B949E',
      textMuted: '#6E7681',
      textAccent: '#58A6FF',
      codeblockContainerBg: '#161B22',
      codeblockContainerBorder: '#30363D',
      codeblockHeaderBg: '#0D1117',
      codeblockHeaderBorder: '#30363D',
      scrollbarThumb: '#30363D',
      scrollbarThumbHover: '#484F58',
      statusSuccess: '#3FB950',
      statusWarning: '#D29922',
      statusError: '#F85149',
      statusInfo: '#58A6FF'
    }
  },

  'github-light': {
    name: 'github-light',
    displayName: 'GitHub Light',
    type: 'light',
    colors: {
      appBg: '#F6F8FA',
      titlebarBg: '#EAEEF2',
      titlebarFg: '#24292F',
      titlebarBorder: '#D0D7DE',
      tabbarBg: '#F6F8FA',
      tabActiveBg: '#FFFFFF',
      tabActiveFg: '#0969DA',
      tabActiveBorder: '#FD8C73',
      tabInactiveBg: '#F6F8FA',
      tabInactiveFg: '#57606A',
      tabHoverBg: '#EAEEF2',
      tabBorder: '#D0D7DE',
      editorBg: '#FFFFFF',
      editorFg: '#24292F',
      activitybarBg: '#F6F8FA',
      activitybarFg: '#57606A',
      activitybarActiveBg: '#EAEEF2',
      activitybarActiveFg: '#0969DA',
      activitybarHoverBg: '#FFFFFF',
      activitybarBorder: '#D0D7DE',
      sidebarBg: '#F6F8FA',
      sidebarFg: '#24292F',
      sidebarHeaderBg: '#FFFFFF',
      sidebarBorder: '#D0D7DE',
      statusbarBg: '#F6F8FA',
      statusbarFg: '#57606A',
      statusbarBorder: '#D0D7DE',
      cardBg: '#FFFFFF',
      cardFg: '#24292F',
      cardHoverBg: '#F6F8FA',
      cardBorder: '#D0D7DE',
      cardSecondaryBg: '#F6F8FA',
      inputBg: '#FFFFFF',
      inputFg: '#24292F',
      inputBorder: '#D0D7DE',
      inputFocusBorder: '#0969DA',
      inputPlaceholder: '#57606A',
      modalBg: '#FFFFFF',
      modalFg: '#24292F',
      modalBorder: '#D0D7DE',
      modalHeaderBg: '#F6F8FA',
      modalOverlay: 'rgba(0, 0, 0, 0.45)',
      dropdownBg: '#FFFFFF',
      dropdownFg: '#24292F',
      dropdownHoverBg: '#0969DA',
      dropdownBorder: '#D0D7DE',
      accentPrimary: '#0969DA',
      accentPrimaryHover: '#0854AF',
      accentContainer: 'rgba(9, 105, 218, 0.1)',
      onAccentContainer: '#0969DA',
      accentRing: 'rgba(9, 105, 218, 0.25)',
      borderPrimary: '#D0D7DE',
      borderSubtle: '#EAEEF2',
      textPrimary: '#24292F',
      textSecondary: '#57606A',
      textMuted: '#6E7781',
      textAccent: '#0969DA',
      codeblockContainerBg: '#F6F8FA',
      codeblockContainerBorder: '#D0D7DE',
      codeblockHeaderBg: '#FFFFFF',
      codeblockHeaderBorder: '#D0D7DE',
      scrollbarThumb: '#D0D7DE',
      scrollbarThumbHover: '#AFB8C1',
      statusSuccess: '#1A7F37',
      statusWarning: '#9A6700',
      statusError: '#CF222E',
      statusInfo: '#0969DA'
    }
  },

  'solarized-dark': {
    name: 'solarized-dark',
    displayName: 'Solarized Dark',
    type: 'dark',
    colors: {
      appBg: '#002B36',
      titlebarBg: '#00141A',
      titlebarFg: '#93A1A1',
      titlebarBorder: '#000E13',
      tabbarBg: '#002B36',
      tabActiveBg: '#073642',
      tabActiveFg: '#268BD2',
      tabActiveBorder: '#268BD2',
      tabInactiveBg: '#002B36',
      tabInactiveFg: '#586E75',
      tabHoverBg: '#094352',
      tabBorder: '#00212B',
      editorBg: '#002B36',
      editorFg: '#93A1A1',
      activitybarBg: '#002B36',
      activitybarFg: '#586E75',
      activitybarActiveBg: '#073642',
      activitybarActiveFg: '#268BD2',
      activitybarHoverBg: '#002B36',
      activitybarBorder: '#00212B',
      sidebarBg: '#002B36',
      sidebarFg: '#93A1A1',
      sidebarHeaderBg: '#073642',
      sidebarBorder: '#00212B',
      statusbarBg: '#002B36',
      statusbarFg: '#586E75',
      statusbarBorder: '#00212B',
      cardBg: '#073642',
      cardFg: '#93A1A1',
      cardHoverBg: '#094352',
      cardBorder: '#00212B',
      cardSecondaryBg: '#002B36',
      inputBg: '#073642',
      inputFg: '#93A1A1',
      inputBorder: '#586E75',
      inputFocusBorder: '#268BD2',
      inputPlaceholder: '#586E75',
      modalBg: '#073642',
      modalFg: '#93A1A1',
      modalBorder: '#00212B',
      modalHeaderBg: '#002B36',
      modalOverlay: 'rgba(0, 0, 0, 0.75)',
      dropdownBg: '#002B36',
      dropdownFg: '#93A1A1',
      dropdownHoverBg: '#268BD2',
      dropdownBorder: '#00212B',
      accentPrimary: '#268BD2',
      accentPrimaryHover: '#1E6EAE',
      accentContainer: 'rgba(38, 139, 210, 0.15)',
      onAccentContainer: '#268BD2',
      accentRing: 'rgba(38, 139, 210, 0.35)',
      borderPrimary: '#00212B',
      borderSubtle: '#073642',
      textPrimary: '#EEE8D5',
      textSecondary: '#93A1A1',
      textMuted: '#586E75',
      textAccent: '#268BD2',
      codeblockContainerBg: '#073642',
      codeblockContainerBorder: '#586E75',
      codeblockHeaderBg: '#002B36',
      codeblockHeaderBorder: '#586E75',
      scrollbarThumb: '#073642',
      scrollbarThumbHover: '#586E75',
      statusSuccess: '#859900',
      statusWarning: '#B58900',
      statusError: '#DC322F',
      statusInfo: '#268BD2'
    }
  }
};

/**
 * Returns the theme token definition for a given theme name, falling back to contextpad-dark.
 */
export function getThemeTokens(name: ThemeName): ThemeTokens {
  return THEMES[name] || THEMES['contextpad-dark'];
}

export interface MermaidThemeConfig {
  theme: 'base';
  darkMode: boolean;
  background: string;
  primaryColor: string;
  primaryTextColor: string;
  primaryBorderColor: string;
  secondaryColor: string;
  secondaryTextColor: string;
  secondaryBorderColor: string;
  tertiaryColor: string;
  tertiaryTextColor: string;
  tertiaryBorderColor: string;
  lineColor: string;
  defaultLinkColor: string;
  edgeLabelBackground: string;
  labelTextColor: string;
  nodeBorder: string;
  nodeTextColor: string;
  clusterBkg: string;
  clusterBorder: string;
  titleColor: string;
  fontFamily: string;
  fontSize: string;
}

/**
 * Returns tailored Mermaid diagram theme variables for a given ThemeName.
 */
export function getMermaidThemeConfig(name: ThemeName): MermaidThemeConfig {
  const theme = getThemeTokens(name);
  const c = theme.colors;
  const isDark = theme.type === 'dark';

  let nodeBg = c.cardSecondaryBg;
  let nodeFg = c.textPrimary;
  let nodeBorder = c.accentPrimary;
  let lineColor = c.accentPrimary;
  let labelBg = c.cardBg;
  let labelFg = c.textPrimary;
  let clusterBg = c.cardSecondaryBg;
  let clusterBorder = c.borderPrimary;

  switch (name) {
    case 'google-material-3':
      nodeBg = c.accentContainer;
      nodeFg = c.onAccentContainer;
      nodeBorder = c.accentPrimary;
      lineColor = c.accentPrimary;
      labelBg = '#FFFFFF';
      labelFg = '#1F1F1F';
      clusterBg = '#EDF2FA';
      clusterBorder = '#CBD2DB';
      break;
    case 'parchment':
      nodeBg = '#EFEAD8';
      nodeFg = '#2C2518';
      nodeBorder = c.accentPrimary;
      lineColor = c.accentPrimary;
      labelBg = '#FCFAF2';
      labelFg = '#2C2518';
      clusterBg = '#F3EEDC';
      clusterBorder = '#DDD5BD';
      break;
    case 'github-light':
      nodeBg = '#DDF4FF';
      nodeFg = '#0969DA';
      nodeBorder = '#0969DA';
      lineColor = '#0969DA';
      labelBg = '#FFFFFF';
      labelFg = '#24292F';
      clusterBg = '#F6F8FA';
      clusterBorder = '#D0D7DE';
      break;
    case 'dracula':
      nodeBg = '#343746';
      nodeFg = '#F8F8F2';
      nodeBorder = '#BD93F9';
      lineColor = '#8BE9FD';
      labelBg = '#21222C';
      labelFg = '#F1FA8C';
      clusterBg = '#282A36';
      clusterBorder = '#6272A4';
      break;
    case 'nord':
      nodeBg = '#3B4252';
      nodeFg = '#ECEFF4';
      nodeBorder = '#88C0D0';
      lineColor = '#81A1C1';
      labelBg = '#2E3440';
      labelFg = '#D8DEE9';
      clusterBg = '#242933';
      clusterBorder = '#4C566A';
      break;
    case 'monokai':
      nodeBg = '#3E3D32';
      nodeFg = '#F8F8F2';
      nodeBorder = '#A6E22E';
      lineColor = '#66D9EF';
      labelBg = '#272822';
      labelFg = '#FD971F';
      clusterBg = '#1E1F1C';
      clusterBorder = '#75715E';
      break;
    case 'one-dark':
      nodeBg = '#2C313C';
      nodeFg = '#ABB2BF';
      nodeBorder = '#61AFEF';
      lineColor = '#61AFEF';
      labelBg = '#21252B';
      labelFg = '#98C379';
      clusterBg = '#282C34';
      clusterBorder = '#3E4451';
      break;
    case 'solarized-dark':
      nodeBg = '#073642';
      nodeFg = '#EEE8D5';
      nodeBorder = '#268BD2';
      lineColor = '#2AA198';
      labelBg = '#002B36';
      labelFg = '#859900';
      clusterBg = '#00212B';
      clusterBorder = '#586E75';
      break;
    case 'github-dark':
      nodeBg = '#21262D';
      nodeFg = '#E6EDF3';
      nodeBorder = '#2F81F7';
      lineColor = '#58A6FF';
      labelBg = '#161B22';
      labelFg = '#E6EDF3';
      clusterBg = '#0D1117';
      clusterBorder = '#30363D';
      break;
    case 'contextpad-dark':
    default:
      nodeBg = isDark ? '#2E2E38' : '#D3E3FD';
      nodeFg = isDark ? '#EDEDED' : '#041E49';
      nodeBorder = isDark ? '#007ACC' : '#0B57D0';
      lineColor = isDark ? '#38BDF8' : '#0B57D0';
      labelBg = isDark ? '#1E1E24' : '#FFFFFF';
      labelFg = isDark ? '#D4D4D8' : '#1F1F1F';
      clusterBg = isDark ? '#18181C' : '#F0F4F9';
      clusterBorder = isDark ? '#33333D' : '#D3D7DC';
      break;
  }

  return {
    theme: 'base',
    darkMode: isDark,
    background: c.editorBg,
    primaryColor: nodeBg,
    primaryTextColor: nodeFg,
    primaryBorderColor: nodeBorder,
    secondaryColor: c.cardHoverBg,
    secondaryTextColor: c.textSecondary,
    secondaryBorderColor: c.borderPrimary,
    tertiaryColor: c.cardSecondaryBg,
    tertiaryTextColor: c.textMuted,
    tertiaryBorderColor: c.borderSubtle,
    lineColor,
    defaultLinkColor: lineColor,
    edgeLabelBackground: labelBg,
    labelTextColor: labelFg,
    nodeBorder,
    nodeTextColor: nodeFg,
    clusterBkg: clusterBg,
    clusterBorder,
    titleColor: c.textPrimary,
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    fontSize: '13px'
  };
}

/**
 * Applies CSS custom property variables to a root HTML element.
 */
export function applyThemeTokensToElement(name: ThemeName, element: HTMLElement): void {
  const theme = getThemeTokens(name);
  const c = theme.colors;

  element.setAttribute('data-theme', name);
  element.setAttribute('data-theme-type', theme.type);

  const style = element.style;
  style.setProperty('--app-bg', c.appBg);
  style.setProperty('--titlebar-bg', c.titlebarBg);
  style.setProperty('--titlebar-fg', c.titlebarFg);
  style.setProperty('--titlebar-border', c.titlebarBorder);
  style.setProperty('--tabbar-bg', c.tabbarBg);
  style.setProperty('--tab-active-bg', c.tabActiveBg);
  style.setProperty('--tab-active-fg', c.tabActiveFg);
  style.setProperty('--tab-active-border', c.tabActiveBorder);
  style.setProperty('--tab-inactive-bg', c.tabInactiveBg);
  style.setProperty('--tab-inactive-fg', c.tabInactiveFg);
  style.setProperty('--tab-hover-bg', c.tabHoverBg);
  style.setProperty('--tab-border', c.tabBorder);
  style.setProperty('--editor-bg', c.editorBg);
  style.setProperty('--editor-fg', c.editorFg);
  style.setProperty('--activitybar-bg', c.activitybarBg);
  style.setProperty('--activitybar-fg', c.activitybarFg);
  style.setProperty('--activitybar-active-bg', c.activitybarActiveBg);
  style.setProperty('--activitybar-active-fg', c.activitybarActiveFg);
  style.setProperty('--activitybar-hover-bg', c.activitybarHoverBg);
  style.setProperty('--activitybar-border', c.activitybarBorder);
  style.setProperty('--sidebar-bg', c.sidebarBg);
  style.setProperty('--sidebar-fg', c.sidebarFg);
  style.setProperty('--sidebar-header-bg', c.sidebarHeaderBg);
  style.setProperty('--sidebar-border', c.sidebarBorder);
  style.setProperty('--statusbar-bg', c.statusbarBg);
  style.setProperty('--statusbar-fg', c.statusbarFg);
  style.setProperty('--statusbar-border', c.statusbarBorder);
  style.setProperty('--card-bg', c.cardBg);
  style.setProperty('--card-fg', c.cardFg);
  style.setProperty('--card-hover-bg', c.cardHoverBg);
  style.setProperty('--card-border', c.cardBorder);
  style.setProperty('--card-secondary-bg', c.cardSecondaryBg);
  style.setProperty('--input-bg', c.inputBg);
  style.setProperty('--input-fg', c.inputFg);
  style.setProperty('--input-border', c.inputBorder);
  style.setProperty('--input-focus-border', c.inputFocusBorder);
  style.setProperty('--input-placeholder', c.inputPlaceholder);
  style.setProperty('--modal-bg', c.modalBg);
  style.setProperty('--modal-fg', c.modalFg);
  style.setProperty('--modal-border', c.modalBorder);
  style.setProperty('--modal-header-bg', c.modalHeaderBg);
  style.setProperty('--modal-overlay', c.modalOverlay);
  style.setProperty('--dropdown-bg', c.dropdownBg);
  style.setProperty('--dropdown-fg', c.dropdownFg);
  style.setProperty('--dropdown-hover-bg', c.dropdownHoverBg);
  style.setProperty('--dropdown-border', c.dropdownBorder);
  style.setProperty('--accent-primary', c.accentPrimary);
  style.setProperty('--accent-primary-hover', c.accentPrimaryHover);
  style.setProperty('--accent-container', c.accentContainer);
  style.setProperty('--on-accent-container', c.onAccentContainer);
  style.setProperty('--accent-ring', c.accentRing);
  style.setProperty('--border-primary', c.borderPrimary);
  style.setProperty('--border-subtle', c.borderSubtle);
  style.setProperty('--text-primary', c.textPrimary);
  style.setProperty('--text-secondary', c.textSecondary);
  style.setProperty('--text-muted', c.textMuted);
  style.setProperty('--text-accent', c.textAccent);
  style.setProperty('--codeblock-container-bg', c.codeblockContainerBg);
  style.setProperty('--codeblock-container-border', c.codeblockContainerBorder);
  style.setProperty('--codeblock-header-bg', c.codeblockHeaderBg);
  style.setProperty('--codeblock-header-border', c.codeblockHeaderBorder);
  style.setProperty('--scrollbar-thumb', c.scrollbarThumb);
  style.setProperty('--scrollbar-thumb-hover', c.scrollbarThumbHover);
  style.setProperty('--status-success', c.statusSuccess);
  style.setProperty('--status-warning', c.statusWarning);
  style.setProperty('--status-error', c.statusError);
  style.setProperty('--status-info', c.statusInfo);

  // Expose Mermaid-specific themed CSS custom properties
  const m = getMermaidThemeConfig(name);
  style.setProperty('--mermaid-canvas-bg', m.background);
  style.setProperty('--mermaid-node-bg', m.primaryColor);
  style.setProperty('--mermaid-node-fg', m.primaryTextColor);
  style.setProperty('--mermaid-node-border', m.primaryBorderColor);
  style.setProperty('--mermaid-line-color', m.lineColor);
  style.setProperty('--mermaid-label-bg', m.edgeLabelBackground);
  style.setProperty('--mermaid-label-fg', m.labelTextColor);
  style.setProperty('--mermaid-cluster-bg', m.clusterBkg);
  style.setProperty('--mermaid-cluster-border', m.clusterBorder);
}
