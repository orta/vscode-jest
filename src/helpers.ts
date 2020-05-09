import { platform } from 'os'
import { existsSync, readFileSync } from 'fs'
import { normalize, join } from 'path'

import { IPluginResourceSettings, hasUserSetPathToJest } from './Settings'

/**
 * Known binary names of `react-scripts` forks
 */
const createReactAppBinaryNames = ['react-scripts', 'react-native-scripts', 'react-scripts-ts', 'react-app-rewired']

/**
 * File extension for npm binaries
 */
export const nodeBinExtension: string = platform() === 'win32' ? '.cmd' : ''

/**
 * Resolves the location of an npm binary
 *
 * Returns the path if it exists, or `undefined` otherwise
 */
function getLocalPathForExecutable(rootPath: string, executable: string): string {
  const absolutePath = normalize(join(rootPath, 'node_modules', '.bin', executable + nodeBinExtension))
  return existsSync(absolutePath) ? absolutePath : undefined
}

/**
 * Tries to read the test command from the scripts section within `package.json`
 *
 * Returns the test command in case of success,
 * `undefined` if there was an exception while reading and parsing `package.json`
 * `null` if there is no test script
 */
export function getTestCommand(rootPath: string): string | undefined | null {
  try {
    const packagePath = join(rootPath, 'package.json')
    const packageJSON = JSON.parse(readFileSync(packagePath, 'utf8'))
    if (packageJSON && packageJSON.scripts && packageJSON.scripts.test) {
      return packageJSON.scripts.test
    }
    return null
  } catch {
    return undefined
  }
}

/**
 * Checks if the supplied test command could have been generated by create-react-app
 */
export function isCreateReactAppTestCommand(testCommand: string): boolean {
  return testCommand && createReactAppBinaryNames.some((binary) => testCommand.includes(`${binary} test`))
}

/**
 * Checks if the project in `rootPath` was bootstrapped by `create-react-app`.
 */
function isBootstrappedWithCreateReactApp(rootPath: string): boolean {
  const testCommand = getTestCommand(rootPath)
  if (testCommand === undefined) {
    // In case parsing `package.json` failed or was unconclusive,
    // fallback to checking for the presence of the binaries in `./node_modules/.bin`
    return createReactAppBinaryNames.some((binary) => getLocalPathForExecutable(rootPath, binary) !== undefined)
  }
  return isCreateReactAppTestCommand(testCommand)
}

/**
 * Handles getting the jest runner, handling the OS and project specific work too
 *
 * @returns {string}
 */
// tslint:disable-next-line no-shadowed-variable
export function pathToJest({ pathToJest, rootPath }: IPluginResourceSettings) {
  if (hasUserSetPathToJest(pathToJest)) {
    return normalize(pathToJest)
  }

  if (isBootstrappedWithCreateReactApp(rootPath)) {
    return 'npm test --'
  }

  const p = getLocalPathForExecutable(rootPath, 'jest') || 'jest' + nodeBinExtension
  return `"${p}"`
}

/**
 * Handles getting the path to config file
 *
 * @returns {string}
 */
export function pathToConfig(pluginSettings: IPluginResourceSettings) {
  if (pluginSettings.pathToConfig !== '') {
    return normalize(pluginSettings.pathToConfig)
  }

  return ''
}

/**
 *  Taken From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

/**
 * ANSI colors/characters cleaning based on http://stackoverflow.com/questions/25245716/remove-all-ansi-colors-styles-from-strings
 */
export function cleanAnsi(str: string): string {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
}
