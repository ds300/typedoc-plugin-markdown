import * as path from 'path';

import {
  Application,
  ParameterType,
  ProjectReflection,
  RendererEvent,
} from 'typedoc';

import { CustomOptionsReader } from './options-reader';
import { MarkdownTheme } from './theme';

export function load(app: Application) {
  addDeclarations(app);
  loadTheme(app);
}

function addDeclarations(app: Application) {
  app.options.addDeclaration({
    help: '[Markdown Plugin] Do not render page title.',
    name: 'hidePageTitle',
    type: ParameterType.Boolean,
    defaultValue: false,
  });

  app.options.addDeclaration({
    help: '[Markdown Plugin] Do not render breadcrumbs in template.',
    name: 'hideBreadcrumbs',
    type: ParameterType.Boolean,
    defaultValue: false,
  });

  app.options.addDeclaration({
    help: '[Markdown Plugin] Specifies the base path that all links to be served from. If omitted all urls will be relative.',
    name: 'publicPath',
    type: ParameterType.String,
  });

  app.options.addDeclaration({
    help: '[Markdown Plugin] Use HTML named anchors as fragment identifiers for engines that do not automatically assign header ids. Should be set for Bitbucket Server docs.',
    name: 'namedAnchors',
    type: ParameterType.Boolean,
    defaultValue: false,
  });

  app.options.addDeclaration({
    help: '[Markdown Plugin] Output all reflections into seperate output files.',
    name: 'allReflectionsHaveOwnDocument',
    type: ParameterType.Boolean,
    defaultValue: false,
  });

  app.options.addDeclaration({
    help: '[Markdown Plugin] Separator used to format filenames.',
    name: 'filenameSeparator',
    type: ParameterType.String,
    defaultValue: '.',
  });

  app.options.addDeclaration({
    help: '[Markdown Plugin] The file name of the entry document.',
    name: 'entryDocument',
    type: ParameterType.String,
    defaultValue: 'README.md',
  });

  app.options.addDeclaration({
    help: '[Markdown Plugin] Do not render in-page table of contents items.',
    name: 'hideInPageTOC',
    type: ParameterType.Boolean,
    defaultValue: false,
  });

  app.options.addDeclaration({
    help: '[Markdown Plugin] Customise the index page title.',
    name: 'indexTitle',
    type: ParameterType.String,
  });
}

function loadTheme(app: Application) {
  const themeRef = app.options.getValue('theme');
  if (['default', 'markdown'].includes(themeRef)) {
    app.renderer.render = render;
    app.renderer.theme = new MarkdownTheme(app.renderer);
  } else {
    const CustomTheme = getCustomTheme(
      path.resolve(path.join(themeRef, 'theme.js')),
    );
    if (CustomTheme !== null) {
      app.options.addReader(new CustomOptionsReader());
      app.renderer.render = render;
      app.renderer.theme = new CustomTheme(app.renderer);
    } else {
      app.logger.warn(
        `[typedoc-plugin-markdown] '${themeRef}' is not a recognised markdown theme.`,
      );
    }
  }
}

async function render(project: ProjectReflection, outputDirectory: string) {
  const output = new RendererEvent(
    RendererEvent.BEGIN,
    outputDirectory,
    project,
  );
  if (
    !this.prepareTheme() ||
    !(await this.prepareOutputDirectory(outputDirectory))
  ) {
    return;
  }
  output.urls = this.theme!.getUrls(project);
  this.trigger(output);
  if (!output.isDefaultPrevented) {
    output?.urls?.forEach((mapping) => {
      this.renderDocument(output.createPageEvent(mapping));
    });
    this.trigger(RendererEvent.END, output);
  }
}

function getCustomTheme(themeFile: string) {
  try {
    const ThemeClass = require(themeFile);
    const instance = ThemeClass[Object.keys(ThemeClass)[0]];
    return instance.prototype instanceof MarkdownTheme ? instance : null;
  } catch (e) {
    return null;
  }
}
