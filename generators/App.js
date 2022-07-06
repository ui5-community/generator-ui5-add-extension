"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const Generator = require("yeoman-generator");
const chalk_1 = __importDefault(require("chalk"));
const yosay_1 = __importDefault(require("yosay"));
const axios_1 = __importDefault(require("axios"));
const js_yaml_1 = require("js-yaml");
const envFile = __importStar(require("envfile"));
class App extends Generator {
    props;
    ui5Yaml;
    currentWriteExt;
    sortOrder;
    constructor(args, opts) {
        super(args, opts);
        this.sortOrder = [
            'ui5-tooling-modules',
            'ui5-middleware-livereload',
            'ui5-middleware-onelogin',
            'ui5-middleware-simpleproxy'
        ];
    }
    async initializing() {
        const data = process.env.debugGenerator === "true"
            ? {
                data: this.fs.readJSON("../bestofui5-data/data/data.json")
            }
            : await (0, axios_1.default)("https://raw.githubusercontent.com/ui5-community/bestofui5-data/live-data/data/data.json");
        const ui5Model = data.data;
        this.types = ui5Model.types;
        this.packages = ui5Model.packages;
        this.middlewares = ui5Model.packages
            .filter(ui5Ext => ui5Ext.type === "middleware")
            .map(ui5Ext => {
            return `${ui5Ext.name} - ${ui5Ext.description}`;
        });
        this.tooling = ui5Model.packages
            .filter(ui5Ext => ui5Ext.type === "tooling")
            .map(ui5Ext => {
            return `${ui5Ext.name} - ${ui5Ext.description}`;
        });
        this.tasks = ui5Model.packages
            .filter(ui5Ext => ui5Ext.type === "task")
            .map(ui5Ext => {
            return `${ui5Ext.name} - ${ui5Ext.description}`;
        });
    }
    async prompting() {
        // Have Yeoman greet the user.
        this.log((0, yosay_1.default)(`Hello, let me help you get sorted with your ${chalk_1.default.red("ui5-tooling")}
          data is from ${chalk_1.default.green("https://bestofui5.org")}`));
        return this._getExtensions();
    }
    async writing() {
        // this.fs.copy(
        //   this.templatePath("dummyfile.txt"),
        //   this.destinationPath("dummyfile.txt")
        // );
        const regName = /^.*(?=( - ))/;
        let ui5Extensions = {};
        try {
            this.ui5Yaml = (0, js_yaml_1.load)(this.fs.read(this.destinationPath("ui5.yaml")));
        }
        catch (e) {
            this.log("Coulnd't find a ui5.yaml file. Am I in the right directory?");
        }
        try {
            const lclEnvFile = (0, js_yaml_1.load)(this.fs.read(this.destinationPath(".env")));
            this.envFile = envFile.parse(lclEnvFile);
        }
        catch (e) {
            this.log("Coulnd't find a .env file");
            this.envFile = {};
        }
        let devDeps = [];
        let ui5Deps = this.packageJson.get("ui5");
        if (this.props.ExtensionsMiddleware) {
            this.props.ExtensionsMiddleware.forEach(async (ui5Ext) => {
                const name = ui5Ext.match(regName)[0];
                const npmPackage = this.packages.find((ui5Ext1) => ui5Ext1.name === name);
                await this._promMiddleware(name);
                let dependency = {};
                if (!ui5Deps.dependencies.find(dep => dep === name)) {
                    ui5Deps.dependencies.push(name);
                }
                dependency[name] = `^${npmPackage.version}`;
                await this.addDevDependencies(dependency);
            });
        }
        if (this.props.ExtensionsTasks) {
            this.props.ExtensionsTasks.forEach(async (ui5Ext) => {
                const name = ui5Ext.match(regName)[0];
                const npmPackage = this.packages.find((ui5Ext1) => ui5Ext1.name === name);
                await this._promTasks(name);
                let dependency = {};
                dependency[name] = `^${npmPackage.version}`;
                await this.addDevDependencies(dependency);
                if (!ui5Deps.dependencies.find(dep => dep === name)) {
                    ui5Deps.dependencies.push(name);
                }
            });
        }
        if (this.props.ExtensionsTooling) {
            this.props.ExtensionsTooling.forEach(async (ui5Ext) => {
                const name = ui5Ext.match(regName)[0];
                const npmPackage = this.packages.find((ui5Ext1) => ui5Ext1.name === name);
                await this._promTooling(name);
                let dependency = {};
                if (!ui5Deps.dependencies.find(dep => dep === name)) {
                    ui5Deps.dependencies.push(name);
                }
                dependency[name] = `^${npmPackage.version}`;
                await this.addDevDependencies(dependency);
            });
        }
        if (this.ui5Yaml.server) {
            this.ui5Yaml.server.customMiddleware = this.ui5Yaml.server.customMiddleware?.sort((a, b) => this.sortOrder.indexOf(a.name) - this.sortOrder.indexOf(b.name)).map((middleware, index, middlewares) => {
                if (index > 0) {
                    const prevMiddleware = middlewares[index - 1];
                    middleware.afterMiddleware = prevMiddleware.name;
                }
                return middleware;
            });
        }
        const newYaml = (0, js_yaml_1.dump)(this.ui5Yaml);
        this.fs.write(this.destinationPath("ui5.yaml"), newYaml);
        if (this.envFile) {
            this.fs.write(this.destinationPath(".env"), envFile.stringify(this.envFile));
        }
    }
    _getExtensions() {
        let prompts = [
            {
                type: "checkbox",
                name: "ExtensionType",
                message: "Which extension type would you like to add?",
                choices: ["Middleware", "Task", "Tooling"],
                default: ["Middleware"],
                store: true
            },
            {
                type: "checkbox",
                name: "ExtensionsMiddleware",
                message: "Choose your middleware extensions?",
                when: (response) => response.ExtensionType.includes("Middleware"),
                choices: [...this.middlewares],
                store: true
            },
            {
                type: "checkbox",
                name: "ExtensionsTasks",
                message: "Choose your task extensions?",
                when: (response) => response.ExtensionType.includes("Task"),
                choices: [...this.tasks],
                store: true
            },
            {
                type: "checkbox",
                name: "ExtensionsTooling",
                message: "Choose your tooling extensions?",
                when: (response) => response.ExtensionType.includes("Tooling"),
                choices: [...this.tooling],
                store: true
            },
        ];
        this.middlewares.forEach((ui5Ext) => {
            const newVarPrompt = this._addVariables(ui5Ext, "middleware", false);
            if (newVarPrompt) {
                newVarPrompt.forEach((prompt) => {
                    prompts.push(prompt);
                });
            }
        });
        this.tasks.forEach((ui5Ext) => {
            const newVarPrompt = this._addVariables(ui5Ext, "tasks", false);
            if (newVarPrompt) {
                newVarPrompt.forEach((prompt) => {
                    prompts.push(prompt);
                });
            }
        });
        this.tooling.forEach((ui5Ext) => {
            const newVarMidPrompt = this._addVariables(ui5Ext, "middleware", true);
            if (newVarMidPrompt) {
                newVarMidPrompt.forEach((prompt) => {
                    prompts.push(prompt);
                });
            }
            const newVarTaskPrompt = this._addVariables(ui5Ext, "task", true);
            if (newVarTaskPrompt) {
                newVarTaskPrompt.forEach((prompt) => {
                    prompts.push(prompt);
                });
            }
        });
        return this.prompt(prompts).then((props) => {
            // To access props later use this.props.someAnswer;
            this.props = props;
        });
    }
    _addVariables(ui5Package, type, isTooling) {
        const ui5Ext = this.packages.find((ui5Ext1) => ui5Ext1.name === ui5Package.split(" - ")[0]);
        if (ui5Ext.jsdoc[type]) {
            let askForEnv = false;
            const prompts = ui5Ext.jsdoc[type].params.map((param) => {
                if (param.env) {
                    askForEnv = true;
                }
                const question = {
                    type: param.type,
                    name: param.env
                        ? `${ui5Ext.name}_ENV_${param.env}`
                        : `${ui5Ext.name}_${param.name}`,
                    message: `Set '${param.name}' - ${param.description}`,
                    store: true,
                    when: (response) => {
                        try {
                            let isFound = response.ExtensionType.filter(extType => response[`Extensions${extType}`].includes(`${ui5Ext.name} - ${ui5Ext.description}`)).length > 0;
                            if (ui5Ext.name !== this.currentWriteExt && isFound) {
                                this.currentWriteExt = ui5Ext.name;
                                this.log(`Set your variables for ${chalk_1.default.blueBright(this._termilink(ui5Ext.name, ui5Ext.githublink))}`);
                            }
                            return isFound;
                        }
                        catch (e) {
                            return false;
                        }
                    }
                };
                if (param.default) {
                    question.default = ((/true/i).test(param.default) || (/false/i).test(param.default)) ? JSON.parse(param.default.toLowerCase()) : param.default;
                }
                return question;
            });
            if (askForEnv) {
                prompts.push({
                    type: "confirm",
                    name: `${ui5Ext.name}_ENV`,
                    message: `Do you want to store the environment variables for ${ui5Ext.name}?`,
                    store: true,
                    when: (response) => {
                        try {
                            return response.ExtensionType.filter(extType => response[`Extensions${extType}`].includes(`${ui5Ext.name} - ${ui5Ext.description}`)).length > 0;
                        }
                        catch (e) {
                            return false;
                        }
                    }
                });
            }
            if (isTooling) {
                prompts.push({
                    type: "checkbox",
                    name: `${ui5Ext.name}_extensions`,
                    message: `How do you want to use this tooling extension?`,
                    store: true,
                    choices: ["Middleware", "Task"],
                    when: (response) => {
                        try {
                            return response.ExtensionType.filter(extType => response[`Extensions${extType}`].includes(`${ui5Ext.name} - ${ui5Ext.description}`)).length > 0;
                        }
                        catch (e) {
                            return false;
                        }
                    }
                });
            }
            return prompts;
        }
        else {
            return;
        }
    }
    _promTooling(ui5Ext) {
        try {
            const name = ui5Ext;
            this.props[`${name}_extensions`].forEach(async (extension) => {
                extension === "Middleware" ? await this._promMiddleware(name, "-middleware") : await this._promTask(name, "-task");
            });
            return Promise.resolve();
        }
        catch {
            return Promise.resolve();
        }
    }
    _promMiddleware(ui5Ext, tooling) {
        try {
            const name = ui5Ext;
            if (!this.ui5Yaml.server) {
                this.ui5Yaml["server"] = {
                    customMiddleware: []
                };
            }
            const regVars = new RegExp(`(?<=${name}_)(?!.*ENV).*$`);
            const regEnvVars = new RegExp(`(?<=${name}_ENV_).*$`);
            const middlewareConf = {
                name: `${name}${tooling ? tooling : ""}`,
                afterMiddleware: "compression",
                configuration: {}
            };
            const vars = Object.keys(this.props).filter((prop) => prop.match(regVars));
            const EnvVars = Object.keys(this.props).filter((prop) => prop.match(regEnvVars));
            vars?.forEach((varName) => {
                if (this.props[varName]) {
                    if (regVars.exec(varName)[0] === "mountPath") {
                        middlewareConf[regVars.exec(varName)[0]] = this.props[varName];
                    }
                    else {
                        middlewareConf.configuration[regVars.exec(varName)[0]] = this.props[varName];
                    }
                }
            });
            EnvVars?.forEach((varName) => {
                if (this.props[varName]) {
                    this.envFile[regEnvVars.exec(varName)[0]] = this.props[varName];
                }
            });
            if (this.ui5Yaml.server.customMiddleware?.find(middleware => middleware.name === middlewareConf.name)) {
                let middlewareIndex = this.ui5Yaml.server.customMiddleware?.findIndex(middleware => middleware.name === middlewareConf.name);
                this.log(chalk_1.default.yellow(`Overwriting existing configuration found for ${middlewareConf.name}, `));
                this.ui5Yaml.server.customMiddleware[middlewareIndex] = middlewareConf;
            }
            else {
                this.ui5Yaml.server.customMiddleware.push(middlewareConf);
            }
            // Get all the middleware config params and add to the yaml file
            return Promise.resolve();
        }
        catch {
            return Promise.resolve();
        }
    }
    _promTasks(ui5Ext) {
        try {
            const name = ui5Ext;
            if (!this.ui5Yaml.builder) {
                this.ui5Yaml["builder"] = {
                    customTasks: []
                };
            }
            const taskConf = {
                name: name,
                afterTasks: "replaceVersion",
                configuration: {}
            };
            const regVars = new RegExp(`(?<=${name}_).*$`);
            const vars = Object.keys(this.props).filter((prop) => prop.match(regVars));
            vars?.forEach((varName) => {
                taskConf.configuration[regVars.exec(varName)[0]] = this.props[varName];
            });
            if (taskConf) {
                this.ui5Yaml.builder.customTasks[taskConf.name]
                    ? (this.ui5Yaml.builder.customTasks[taskConf.name] = taskConf)
                    : this.ui5Yaml.builder.customTasks.push(taskConf);
            }
            // Get all the tasks config params and add to the yaml file
            return Promise.resolve();
        }
        catch {
            return Promise.resolve();
        }
    }
    _termilink(text, url) {
        const OSC = '\u001B]';
        const BEL = '\u0007';
        const SEP = ';';
        return [OSC, '8', SEP, SEP, url, BEL, text, OSC, '8', SEP, SEP, BEL].join('');
    }
}
exports.App = App;
//# sourceMappingURL=App.js.map