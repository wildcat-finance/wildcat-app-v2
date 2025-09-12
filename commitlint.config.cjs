/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [2, 'always', [
            'feat','fix','chore','docs','refactor','test','build','ci','perf','revert'
        ]],
        'subject-case': [0]
    }
};
