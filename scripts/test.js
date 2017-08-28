#!/usr/bin/env node
const inquirer = require('inquirer');
const program = require('commander');
const childProcess = require('child_process');
const chalk = require('chalk');
const log = require('npmlog');

log.heading = 'storybook';
const prefix = 'test';
log.addLevel('aborted', 3001, { fg: 'red', bold: true });

const spawn = command =>
  childProcess.spawnSync(`${command}`, {
    shell: true,
    stdio: 'inherit',
  });

const main = program.version('3.0.0').option('--all', `Test everything ${chalk.gray('(all)')}`);

const createProject = ({ defaultValue, option, name, projectLocation }) => ({
  value: false,
  defaultValue: defaultValue || false,
  option: option || undefined,
  name: name || 'unnamed task',
  projectLocation,
});
const createOption = ({ defaultValue, option, name, extraParam }) => ({
  value: false,
  defaultValue: defaultValue || false,
  option: option || undefined,
  name: name || 'unnamed task',
  extraParam,
});

const tasks = {
  core: createProject({
    name: `Core & React & Vue ${chalk.gray('(core)')}`,
    defaultValue: true,
    option: '--core',
    projectLocation: './',
  }),
  'react-native-vanilla': createProject({
    name: `React-Native example ${chalk.gray('(react-native-vanilla)')}`,
    defaultValue: true,
    option: '--reactnative',
    projectLocation: './examples/react-native-vanilla',
  }),
  // 'crna-kitchen-sink': createProject({
  //   name: `React-Native-App example ${chalk.gray('(crna-kitchen-sink)')}  ${chalk.red(
  //     '[not implemented yet]'
  //   )}`,
  //   defaultValue: false,
  //   option: '--reactnativeapp',
  //   projectLocation: './examples/crna-kitchen-sink',
  // }),
  watchmode: createOption({
    name: `Run in watch-mode ${chalk.gray('(watchmode)')}`,
    defaultValue: false,
    option: '--watch',
    projectLocation: false,
    extraParam: '--watch',
  }),
};

const getProjects = list => {
  const filtered = list.filter(key => key.projectLocation);
  if (filtered.length > 0) {
    return filtered.map(key => key.projectLocation);
  }

  // if list would have been empty, we run with default projects
  return Object.keys(tasks)
    .map(key => tasks[key])
    .filter(key => key.projectLocation && key.defaultValue)
    .map(key => key.projectLocation);
};

const getExtraParams = list => list.filter(key => key.extraParam).map(key => key.extraParam);

Object.keys(tasks)
  .reduce((acc, key) => acc.option(tasks[key].option, tasks[key].name), main)
  .parse(process.argv);

Object.keys(tasks).forEach(key => {
  tasks[key].value =
    program[tasks[key].option.replace('--', '')] || (program.all && tasks[key].projectLocation);
});

let selection;
if (!Object.keys(tasks).map(key => tasks[key].value).filter(Boolean).length) {
  selection = inquirer
    .prompt([
      {
        type: 'checkbox',
        message: 'Select which tests to run',
        name: 'todo',
        choices: Object.keys(tasks)
          .map(key => tasks[key])
          .filter(key => key.projectLocation)
          .map(key => ({
            name: key.name,
            checked: key.defaultValue,
          }))
          .concat(new inquirer.Separator())
          .concat(
            Object.keys(tasks).map(key => tasks[key]).filter(key => key.extraParam).map(key => ({
              name: key.name,
              checked: key.defaultValue,
            }))
          ),
      },
    ])
    .then(({ todo }) =>
      todo.map(name => tasks[Object.keys(tasks).find(i => tasks[i].name === name)])
    );
} else {
  selection = Promise.resolve(
    Object.keys(tasks).map(key => tasks[key]).filter(item => item.value === true)
  );
}

selection
  .then(list => {
    if (list.length === 0) {
      log.warn(prefix, 'Nothing to test');
    } else {
      spawn(`jest --projects ${getProjects(list).join(' ')} ${getExtraParams(list).join(' ')}`);
      process.stdout.write('\x07');
      try {
        spawn('say "Testing sequence complete"');
      } catch (e) {
        // discard error
      }
    }
  })
  .catch(e => {
    log.aborted(prefix, chalk.red(e.message));
    log.silly(prefix, e);
  });
