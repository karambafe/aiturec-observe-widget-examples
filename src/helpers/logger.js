const log = (level = 'log', title, ...args) => {
  console[level](`[Widget Observer]: ${title}`, ...args);
};

export const logInfo = (...args) => log('log', ...args);
export const logError = (...args) => log('error', ...args);

export const logGroup = title => log('group', title);
export const logGroupEnd = () => log('groupEnd');
