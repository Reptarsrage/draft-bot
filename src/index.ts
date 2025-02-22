import startBot from './bot';
import registerSlashCommands from './slashCommands';

await Promise.all([
    registerSlashCommands(),
    startBot(),
]);
