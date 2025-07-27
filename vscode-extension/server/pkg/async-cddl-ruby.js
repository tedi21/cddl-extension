const { fork } = require('node:child_process');
const process = require('node:process');

const cddl_operation = {
    VERIFY: 1,
    GENERATE: 2
};

async function async_cddl_ruby(operation, txt) {
    let result = {};
    const waitChild = function () {
        return new Promise((resolve, reject) => {
            const controller = new AbortController();
            const { signal } = controller;
            const child = fork(__dirname + '/../pkg/process-cddl-ruby.js', ['child', txt, operation], { cwd: './', execArgv: process.execArgv.concat(['--stack-size=9192']), signal });
            child.on('error', (err) => {
                // This will be called with err being an AbortError if the controller aborts
                console.log(`child process not launched with err ${err}`);
            });
            child.on('exit', (code) => {
                //console.log(`child process exited with code ${code}`);
                resolve(result);
            });
            child.on('message', (message) => {
                result = message;
                //console.log(message.result + " :\n" + message.output);
            });
        });
    }
    return await waitChild();
    //console.log("after");    
    //controller.abort(); // Stops the child process
}

module.exports = {
    cddl_ruby: async_cddl_ruby,
    cddl_operation: cddl_operation
}