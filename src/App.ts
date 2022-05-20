"use strict";
import Generator = require("yeoman-generator");
import chalk from "chalk";
import yosay from "yosay";
import axios from "axios";
import inquirer, { Inquirer } from "inquirer";
interface IGitRepo {
  type: string;
  url: string;
  directory: string;
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
    const data = await axios("https://bestofui5.org/model/data.json");
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

    //create a txt file with the extension config
    ui5Model.packages.forEach(ui5Ext => {
      this.fs.write(
        `.generators/app/templates/${ui5Ext.name}.txt`,
        `${ui5Ext.readme}`
      );
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
    console.log(this.props);
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
          type: param.type === "boolean" ? "confirm" : "input",
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

// public async install() {
//   this.installDependencies();
// }
