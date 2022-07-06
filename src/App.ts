"use strict";
import Generator = require("yeoman-generator");
import chalk from "chalk";
import yosay from "yosay";
import axios from "axios";
import { load, dump } from "js-yaml";
import * as envFile from "envfile";


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

interface extension {
  server?: {
    customMiddleware: any[];
  };
  customMiddleware?: any[];
  builder?: {
    customTasks: any[];
  };
  customTasks?: any[];
}
interface promptResponse {
  ExtensionMiddleware: string[]
  ExtensionTooling: string[]
  ExtensionType: String[]

}
interface ExtensionType { ExtensionType: string | string[]; }
interface ui5Dependency {
  dependencies: Array<string>;
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
  ui5Yaml: IUi5Yaml;
  currentWriteExt: string;
  sortOrder: string[];
  public constructor(args: string[], opts: []) {
    super(args, opts);
    this.sortOrder = [
      'ui5-tooling-modules',
      'ui5-middleware-livereload',
      'ui5-middleware-onelogin',
      'ui5-middleware-simpleproxy'

    ]
  }
  public async initializing() {
    const data =
      process.env.debugGenerator === "true"
        ? {
          data: this.fs.readJSON(
            "../bestofui5-data/data/data.json"
          )
        }
        : await axios(
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


  public async prompting() {
    // Have Yeoman greet the user.
    this.log(
      yosay(
        `Hello, let me help you get sorted with your ${chalk.red(
          "ui5-tooling")}
          data is from ${chalk.green("https://bestofui5.org")}`
      )
    );

    return this._getExtensions();
  }

  public async writing() {
    // this.fs.copy(
    //   this.templatePath("dummyfile.txt"),
    //   this.destinationPath("dummyfile.txt")
    // );
    const regName = /^.*(?=( - ))/;

    let ui5Extensions: extension = {};

    try {
      this.ui5Yaml = load(
        this.fs.read(this.destinationPath("ui5.yaml"))
      ) as IUi5Yaml;
    }
    catch (e) {
      this.log("Coulnd't find a ui5.yaml file. Am I in the right directory?");

    }
    try {
      const lclEnvFile = load(
        this.fs.read(this.destinationPath(".env"))
      ) as string;

      this.envFile = envFile.parse(lclEnvFile);
    } catch (e) {
      this.log("Coulnd't find a .env file");
      this.envFile = {};
    }
    let devDeps: string[] = []
    let ui5Deps: ui5Dependency = this.packageJson.get("ui5")
    if (this.props.ExtensionsMiddleware) {
      this.props.ExtensionsMiddleware.forEach(async (ui5Ext: string) => {
        
        const name = ui5Ext.match(regName)![0];
        const npmPackage : IPackage = this.packages.find(
          (ui5Ext1: { name: string }) => ui5Ext1.name === name
        );
        await this._promMiddleware(name);

        let dependency = {} as any;
        if (!ui5Deps.dependencies.find(dep => dep === name)) {
          ui5Deps.dependencies.push(name)
        }
        dependency[name] = `^${npmPackage.version}`;
        await this.addDevDependencies(dependency)
      });
    }



    if (this.props.ExtensionsTasks) {
      this.props.ExtensionsTasks.forEach(async (ui5Ext: string) => {
        const name = ui5Ext.match(regName)![0];
        const npmPackage : IPackage = this.packages.find(
          (ui5Ext1: { name: string }) => ui5Ext1.name === name
        );
        await this._promTasks(name);

        let dependency = {} as any;
        dependency[name] = `^${npmPackage.version}`;
        await this.addDevDependencies(dependency)

        if (!ui5Deps.dependencies.find(dep => dep === name)) {
          ui5Deps.dependencies.push(name)
        }

      });
    }

    if (this.props.ExtensionsTooling) {

      this.props.ExtensionsTooling.forEach(async (ui5Ext: string) => {
        const name = ui5Ext.match(regName)![0];
        const npmPackage : IPackage = this.packages.find(
          (ui5Ext1: { name: string }) => ui5Ext1.name === name
        );
        await this._promTooling(name);

        let dependency = {} as any;
        if (!ui5Deps.dependencies.find(dep => dep === name)) {
          ui5Deps.dependencies.push(name)
        }
        dependency[name] = `^${npmPackage.version}`;
        await this.addDevDependencies(dependency)
      });
    }
    
    if (this.ui5Yaml.server) {
      this.ui5Yaml.server.customMiddleware = this.ui5Yaml.server.customMiddleware?.sort((a, b) => this.sortOrder.indexOf(a.name) - this.sortOrder.indexOf(b.name)).map((middleware, index, middlewares) => {
        if (index > 0) {
          const prevMiddleware = middlewares[index - 1];
          middleware.afterMiddleware = prevMiddleware.name
        }
        return middleware
      })
    }
    const newYaml = dump(this.ui5Yaml);
    this.fs.write(this.destinationPath("ui5.yaml"), newYaml);
    if (this.envFile) {
      this.fs.write(
        this.destinationPath(".env"),
        envFile.stringify(this.envFile)
      );
    }
  }

  private _getExtensions() {

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
      },
      {
        type: "checkbox",
        name: "ExtensionsTooling",
        message: "Choose your tooling extensions?",
        when: (response: { ExtensionType: string | string[] }) =>
          response.ExtensionType.includes("Tooling"),
        choices: [...this.tooling],
        store: true
      },
    ];
    this.middlewares.forEach((ui5Ext: string) => {
      const newVarPrompt: Array<Generator.Question> | undefined = this._addVariables(
        ui5Ext,
        "middleware",
        false
      );
      if (newVarPrompt) {
        newVarPrompt.forEach((prompt: any) => {
          prompts.push(prompt);
        });
      }
    });

    this.tasks.forEach((ui5Ext: string) => {
      const newVarPrompt: Array<Generator.Question> | undefined = this._addVariables(
        ui5Ext,
        "tasks",
        false
      );
      if (newVarPrompt) {
        newVarPrompt.forEach((prompt: any) => {
          prompts.push(prompt);
        });
      }
    });
    this.tooling.forEach((ui5Ext: string) => {
      const newVarMidPrompt: Array<Generator.Question> | undefined = this._addVariables(
        ui5Ext,
        "middleware",
        true
      );
      if (newVarMidPrompt) {
        newVarMidPrompt.forEach((prompt: any) => {
          prompts.push(prompt);
        });
      }

      const newVarTaskPrompt: Array<Generator.Question> | undefined = this._addVariables(
        ui5Ext,
        "task",
        true
      );
      if (newVarTaskPrompt) {
        newVarTaskPrompt.forEach((prompt: any) => {
          prompts.push(prompt);
        });
      }
    });

    return this.prompt(prompts).then((props: any) => {
      // To access props later use this.props.someAnswer;

      this.props = props;
    });
  }

  private _addVariables(ui5Package: string, type: string, isTooling: boolean): Generator.Question[] | undefined {
    const ui5Ext = this.packages.find(
      (ui5Ext1: { name: string }) => ui5Ext1.name === ui5Package.split(" - ")[0]
    );
    if (ui5Ext.jsdoc[type]) {
      let askForEnv = false;

      const prompts = ui5Ext.jsdoc[type].params.map((param: any) => {
        if (param.env) {
          askForEnv = true;
        }
        const question: Generator.Question = {
          type: param.type,
          name: param.env
            ? `${ui5Ext.name}_ENV_${param.env}`
            : `${ui5Ext.name}_${param.name}`,
          message: `Set '${param.name}' - ${param.description}`,
          store: true,
          when: (response: Partial<promptResponse>) => {
            try {

              let isFound = response.ExtensionType!.filter(extType =>
                response[`Extensions${extType}` as keyof ExtensionType]!.includes(
                  `${ui5Ext.name} - ${ui5Ext.description}`

                )).length > 0

              if (ui5Ext.name !== this.currentWriteExt && isFound) {

                this.currentWriteExt = ui5Ext.name;

                this.log(`Set your variables for ${chalk.blueBright(this._termilink(ui5Ext.name, ui5Ext.githublink))}`)
              }

              return isFound
            }
            catch (e) {
              return false
            }
          }
        }
        if (param.default) {
          question.default = ((/true/i).test(param.default) || (/false/i).test(param.default)) ? JSON.parse(param.default.toLowerCase()) : param.default;
        }
        return question
      })
      if (askForEnv) {
        prompts.push({
          type: "confirm",
          name: `${ui5Ext.name}_ENV`,
          message: `Do you want to store the environment variables for ${ui5Ext.name}?`,
          store: true,
          when: (response: Partial<promptResponse>) => {
            try {
              return response.ExtensionType!.filter(extType =>
                response[`Extensions${extType}` as keyof ExtensionType]!.includes(
                  `${ui5Ext.name} - ${ui5Ext.description}`

                )).length > 0

            }
            catch (e) {
              return false
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
          when: (response: Partial<promptResponse>) => {
            try {
              return response.ExtensionType!.filter(extType =>
                response[`Extensions${extType}` as keyof ExtensionType]!.includes(
                  `${ui5Ext.name} - ${ui5Ext.description}`

                )).length > 0
            }
            catch (e) {
              return false
            }
          }
        });
      }
      return prompts;
    } else {
      return;
    }
  }

  private _promTooling(ui5Ext: string): Promise<void> {
    try {
      const name = ui5Ext
      this.props[`${name}_extensions`].forEach(async (extension: string) => {
        extension === "Middleware" ? await this._promMiddleware(name, "-middleware") : await this._promTask(name, "-task");
      });
      return Promise.resolve();
    }
    catch {
      return Promise.resolve()
    }
  }

  private _promMiddleware(ui5Ext: string, tooling? :string ): Promise<void> {
    try {

      const name = ui5Ext

      if (!this.ui5Yaml.server) {
        this.ui5Yaml["server"] = {
          customMiddleware: []
        };
      }

     

      const regVars = new RegExp(`(?<=${name}_)(?!.*ENV).*$`);
      const regEnvVars = new RegExp(`(?<=${name}_ENV_).*$`);

      const middlewareConf: any = {
        name: `${name}${tooling}`,
        afterMiddleware: "compression",
        configuration: {}
      };

      const vars = Object.keys(this.props).filter((prop: string) =>
        prop.match(regVars)
      );
      const EnvVars = Object.keys(this.props).filter((prop: string) =>
        prop.match(regEnvVars)
      );
      vars?.forEach((varName: string) => {
        if (this.props[
          varName
        ]) {
          if (regVars.exec(varName)![0] === "mountPath"){
            middlewareConf[regVars.exec(varName)![0]] = this.props[
              varName
            ];
          }
          else {
          middlewareConf.configuration[regVars.exec(varName)![0]] = this.props[
            varName
          ];
        }
        }
      });
      EnvVars?.forEach((varName: string) => {
        if (this.props[
          varName
        ]) {
          this.envFile[regEnvVars.exec(varName)![0]] = this.props[varName];
        }
      });


      if (this.ui5Yaml.server.customMiddleware?.find(middleware => middleware.name === middlewareConf.name)) {
        let middlewareIndex = this.ui5Yaml.server.customMiddleware?.findIndex(middleware => middleware.name === middlewareConf.name)
        this.log(chalk.yellow(`Overwriting existing configuration found for ${middlewareConf.name}, `))
        this.ui5Yaml.server.customMiddleware[middlewareIndex] = middlewareConf;
      }
      else {
        this.ui5Yaml.server.customMiddleware!.push(middlewareConf);
      }

      // Get all the middleware config params and add to the yaml file

      return Promise.resolve();
    }
    catch {
      return Promise.resolve()
    }
  }

  private _promTasks(ui5Ext: string): Promise<void> {
    try {
      const name = ui5Ext

      if (!this.ui5Yaml.builder) {
        this.ui5Yaml["builder"] = {
          customTasks: []
        };
      }
      const taskConf: any = {
        name: name,
        afterTasks: "replaceVersion",
        configuration: {}
      };
      const regVars = new RegExp(`(?<=${name}_).*$`);
      const vars = Object.keys(this.props).filter((prop: string) =>
        prop.match(regVars)
      );
      vars?.forEach((varName: string) => {
        taskConf.configuration[regVars.exec(varName)![0]] = this.props[varName];
      });

      if (taskConf) {
        this.ui5Yaml.builder!.customTasks![taskConf.name]
          ? (this.ui5Yaml.builder!.customTasks![taskConf.name] = taskConf)
          : this.ui5Yaml.builder!.customTasks!.push(taskConf);
      }

      // Get all the tasks config params and add to the yaml file

      return Promise.resolve();
    }
    catch {
      return Promise.resolve()
    }
  }

  private _termilink(text: string, url: string): string {
    const OSC = '\u001B]';
    const BEL = '\u0007';
    const SEP = ';';

    return [OSC, '8', SEP, SEP, url, BEL, text, OSC, '8', SEP, SEP, BEL].join('');
  }
}
