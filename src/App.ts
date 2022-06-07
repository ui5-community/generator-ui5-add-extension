"use strict";
import Generator = require("yeoman-generator");
import chalk from "chalk";
import yosay from "yosay";
import axios from "axios";
import { load, dump } from "js-yaml";
interface IGitRepo {
  type: string;
  url: string;
  directory: string;
}

interface IUi5Yaml {
  specVersion: string;
  metadata: {
    name: string;
  };
  resources: any;
  type: string;
  server?: {
    customMiddleware?: any[];
  };
  builder?: {
    customTasks: any[];
  };
}

interface IPackage {
  jsdoc: any;
  name: string;
  version: string;
  description: string;
  private: boolean;
  author: string;
  license: string;
  repository: IGitRepo;
  readme: string;
  dependencies: object;
  type: string;
  forks: number;
  stars: number;
  githublink: string;
  downloads: number;
}
interface IUI5Model {
  types: string[];
  packages: IPackage[];
}

interface IVarProp {
  name: string;
  value: string;
}

interface IGeneratorOptions {
  name: string;
  description: string;
  type: "list" | "checkbox" | "input" | "confirm" | "password" | "number";
  when: boolean | Function;
  choices?: string[];
}
export class App extends Generator {
  [x: string]: any;
  props: any;
  public constructor(args: string[], opts: []) {
    super(args, opts);
  }
  public async initializing() {
    const data = await axios(
      "https://raw.githubusercontent.com/ui5-community/bestofui5-data/live-data/data/data.json"
    );
    const ui5Model: IUI5Model = data.data;
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

  public async prompting() {
    // Have Yeoman greet the user.
    this.log(
      yosay(
        `Hello, let me help you get sorted with your ${chalk.red(
          "ui5-tooling"
        )}`
      )
    );

    return this._getExtensions();
  }

  public async writing() {
    // this.fs.copy(
    //   this.templatePath("dummyfile.txt"),
    //   this.destinationPath("dummyfile.txt")
    // );

    var ui5Yaml = load(
      this.fs.read(this.destinationPath("ui5.yaml"))
    ) as IUi5Yaml;
    const regName = /^.*(?=( - ))/;
    if (this.props.ExtensionsMiddleware) {
      const PromMiddleware = new Promise<void>((resolve, reject) => {
        this.props.ExtensionsMiddleware.forEach(async (ui5Ext: string) => {
          let dependency = {} as any;
          const name = ui5Ext.match(regName)![0];
          dependency[name] = "latest";
          await this.addDevDependencies(dependency);
          if (!ui5Yaml.server || !ui5Yaml.server.customMiddleware) {
            ui5Yaml["server"] = {
              customMiddleware: []
            };
          }
          const middlewareConf: any = {
            name: name,
            afterMiddleware: "compression",
            configuration: {}
          };
          const regVars = new RegExp(`(?<=${name}_).*$`);
          const vars = Object.keys(this.props).filter((prop: string) =>
            prop.match(regVars)
          );
          vars.forEach((varName: string) => {
            middlewareConf.configuration[
              regVars.exec(varName)![0]
            ] = this.props[varName];
          });

          if (middlewareConf && ui5Yaml.server.customMiddleware) {
            ui5Yaml.server.customMiddleware.push(middlewareConf!);
          }

          // Get all the middleware config params and add to the yaml file
          // ui5Yaml.server.customMiddleware.push({
        });
        resolve();
      });

      await PromMiddleware;

      const newYaml = dump(ui5Yaml);

      console.log(newYaml);
      this.fs.write(this.destinationPath("ui5.yaml"), newYaml);
    }

    if (this.props.ExtensionsTasks) {
      this.props.ExtensionsTasks.forEach(async (ui5Ext: string) => {
        let dependency = {} as any;
        dependency[ui5Ext.split(" - ")[0]] = "latest";
        await this.addDevDependencies(dependency);
      });
    }
  }

  private _getExtensions() {
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
        when: (response: { ExtensionType: string | string[] }) =>
          response.ExtensionType.includes("Middleware"),
        choices: [...this.middlewares],
        store: true
      },
      {
        type: "checkbox",
        name: "ExtensionsTasks",
        message: "Choose your task extensions?",
        when: (response: { ExtensionType: string | string[] }) =>
          response.ExtensionType.includes("Task"),
        choices: [...this.tasks],
        store: true
      }
    ];
    this.middlewares.forEach((ui5Ext: string) => {
      const newVarPrompt: Array<object> | undefined = this._addVariables(
        ui5Ext,
        "middleware"
      );
      if (newVarPrompt) {
        newVarPrompt.forEach((prompt: any) => {
          prompts.push(prompt);
        });
      }
    });

    this.tasks.forEach((ui5Ext: string) => {
      const newVarPrompt: Array<object> | undefined = this._addVariables(
        ui5Ext,
        "tasks"
      );
      if (newVarPrompt) {
        newVarPrompt.forEach((prompt: any) => {
          prompts.push(prompt);
        });
      }
    });

    return this.prompt(prompts).then((props: any) => {
      // To access props later use this.props.someAnswer;

      this.props = props;
    });
  }

  private _addVariables(ui5Package: string, type: string) {
    const ui5Ext = this.packages.find(
      (ui5Ext1: { name: string }) => ui5Ext1.name === ui5Package.split(" - ")[0]
    );
    if (ui5Ext.jsdoc[type]) {
      const prompts = ui5Ext.jsdoc[type].params.map((param: any) => {
        return {
          type: param.type,
          name: `${ui5Ext.name}_${param.name}`,
          message: `Add variable '${param.name}' for ${ui5Ext.name}`,
          store: true,
          when: (response: { ExtensionsMiddleware: string | string[] }) =>
            response.ExtensionsMiddleware.includes(
              `${ui5Ext.name} - ${ui5Ext.description}`
            )
        };
      });

      return prompts;
    } else {
      return;
    }
  }
}
