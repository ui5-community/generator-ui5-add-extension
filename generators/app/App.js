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
    constructor(args, opts) {
        super(args, opts);
    }
    async initializing() {
        const data = process.env.debugGenerator === "true"
            ? {
                data: this.fs.readJSON("/Users/I565634/git/bestofui5-data/data/data.json")
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
        this.tasks = ui5Model.packages
            .filter(ui5Ext => ui5Ext.type === "task")
            .map(ui5Ext => {
            return `${ui5Ext.name} - ${ui5Ext.description}`;
        });
    }
    async prompting() {
        // Have Yeoman greet the user.
        this.log((0, yosay_1.default)(`Hello, let me help you get sorted with your ${chalk_1.default.red("ui5-tooling")}`));
        return this._getExtensions();
    }
    async writing() {
        // this.fs.copy(
        //   this.templatePath("dummyfile.txt"),
        //   this.destinationPath("dummyfile.txt")
        // );
        const regName = /^.*(?=( - ))/;
        if (this.props.ExtensionsMiddleware) {
            await this.promMiddleware();
            this.props.ExtensionsMiddleware.forEach(async (ui5Ext) => {
                let dependency = {};
                const name = ui5Ext.match(regName)[0];
                dependency[name] = "latest";
                await this.addDevDependencies(dependency);
            });
        }
        if (this.props.ExtensionsTasks) {
            this.props.ExtensionsTasks.forEach(async (ui5Ext) => {
                let dependency = {};
                dependency[ui5Ext.split(" - ")[0]] = "latest";
                await this.addDevDependencies(dependency);
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
                choices: ["Middleware", "Task"],
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
            }
        ];
        this.middlewares.forEach((ui5Ext) => {
            const newVarPrompt = this._addVariables(ui5Ext, "middleware");
            if (newVarPrompt) {
                newVarPrompt.forEach((prompt) => {
                    prompts.push(prompt);
                });
            }
        });
        this.tasks.forEach((ui5Ext) => {
            const newVarPrompt = this._addVariables(ui5Ext, "tasks");
            if (newVarPrompt) {
                newVarPrompt.forEach((prompt) => {
                    prompts.push(prompt);
                });
            }
        });
        return this.prompt(prompts).then((props) => {
            // To access props later use this.props.someAnswer;
            this.props = props;
        });
    }
    _addVariables(ui5Package, type) {
        const ui5Ext = this.packages.find((ui5Ext1) => ui5Ext1.name === ui5Package.split(" - ")[0]);
        if (ui5Ext.jsdoc[type]) {
            let askForEnv = false;
            const prompts = ui5Ext.jsdoc[type].params.map((param) => {
                if (param.env) {
                    askForEnv = true;
                }
                return {
                    type: param.type,
                    name: param.env
                        ? `${ui5Ext.name}_ENV_${param.env}`
                        : `${ui5Ext.name}_${param.name}`,
                    message: `Add variable '${param.name}' for ${ui5Ext.name}`,
                    store: true,
                    when: (response) => response.ExtensionsMiddleware.includes(`${ui5Ext.name} - ${ui5Ext.description}`)
                };
            });
            if (askForEnv) {
                prompts.push({
                    type: "confirm",
                    name: `${ui5Ext.name}_ENV`,
                    message: `Do you want to store the environment variables for ${ui5Ext.name}?`,
                    store: true,
                    when: (response) => response.ExtensionsMiddleware.includes(`${ui5Ext.name} - ${ui5Ext.description}`)
                });
            }
            return prompts;
        }
        else {
            return;
        }
    }
    promMiddleware() {
        var _a;
        const regName = /^.*(?=( - ))/;
        let ui5Extensions = {};
        this.ui5Yaml = (0, js_yaml_1.load)(this.fs.read(this.destinationPath("ui5.yaml")));
        try {
            const lclEnvFile = (0, js_yaml_1.load)(this.fs.read(this.destinationPath(".env")));
            this.envFile = envFile.parse(lclEnvFile);
        }
        catch (e) {
            console.log(e);
            this.envFile = {};
        }
        (_a = this.props.ExtensionsMiddleware) === null || _a === void 0 ? void 0 : _a.forEach(async (ui5Ext) => {
            const name = ui5Ext.match(regName)[0];
            if (!this.ui5Yaml.server) {
                this.ui5Yaml["server"] = {
                    customMiddleware: []
                };
            }
            // else {
            //   ui5Extensions["customMiddleware"] = [];
            // }
            const middlewareConf = {
                name: name,
                afterMiddleware: "compression",
                configuration: {}
            };
            const regVars = new RegExp(`(?<=${name}_)(?!.*ENV).*$`);
            const regEnvVars = new RegExp(`(?<=${name}_ENV_).*$`);
            const vars = Object.keys(this.props).filter((prop) => prop.match(regVars));
            const EnvVars = Object.keys(this.props).filter((prop) => prop.match(regEnvVars));
            vars === null || vars === void 0 ? void 0 : vars.forEach((varName) => {
                middlewareConf.configuration[regVars.exec(varName)[0]] = this.props[varName];
            });
            EnvVars === null || EnvVars === void 0 ? void 0 : EnvVars.forEach((varName) => {
                this.envFile[regEnvVars.exec(varName)[0]] = this.props[varName];
            });
            if (middlewareConf) {
                this.ui5Yaml.server.customMiddleware[middlewareConf.name]
                    ? (this.ui5Yaml.server.customMiddleware[middlewareConf.name] = middlewareConf)
                    : this.ui5Yaml.server.customMiddleware.push(middlewareConf);
            }
            // Get all the middleware config params and add to the yaml file
        });
        return Promise.resolve();
    }
    promTasks() {
        var _a;
        const regName = /^.*(?=( - ))/;
        let ui5Extensions = {};
        if (!this.ui5Yaml) {
            this.ui5Yaml = (0, js_yaml_1.load)(this.fs.read(this.destinationPath("ui5.yaml")));
        }
        (_a = this.props.ExtensionsTasks) === null || _a === void 0 ? void 0 : _a.forEach(async (ui5Ext) => {
            const name = ui5Ext.match(regName)[0];
            if (!this.ui5Yaml.builder) {
                this.ui5Yaml["builder"] = {
                    customTasks: []
                };
            }
            // else {
            //   ui5Extensions["customMiddleware"] = [];
            // }
            const taskConf = {
                name: name,
                afterTasks: "replaceVersion",
                configuration: {}
            };
            const regVars = new RegExp(`(?<=${name}_).*$`);
            const vars = Object.keys(this.props).filter((prop) => prop.match(regVars));
            vars === null || vars === void 0 ? void 0 : vars.forEach((varName) => {
                taskConf.configuration[regVars.exec(varName)[0]] = this.props[varName];
            });
            if (taskConf) {
                this.ui5Yaml.builder.customTasks[taskConf.name]
                    ? (this.ui5Yaml.builder.customTasks[taskConf.name] = taskConf)
                    : this.ui5Yaml.builder.customTasks.push(taskConf);
            }
            // Get all the middleware config params and add to the yaml file
        });
        return Promise.resolve();
    }
}
exports.App = App;
//# sourceMappingURL=App.js.map