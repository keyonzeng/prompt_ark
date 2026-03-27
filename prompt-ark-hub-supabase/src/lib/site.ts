export const APP_NAME = 'PromptArk'
export const HUB_PATH = '/hub'
export const EXTENSION_URL = 'https://github.com/KeyonZeng/prompt_ark'

export function getCurrentPageUrl() {
  return `${window.location.origin}${window.location.pathname}`
}

export function getHubUrl() {
  return new URL(HUB_PATH, window.location.origin).toString()
}
