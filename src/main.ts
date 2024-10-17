import React from "react";
import * as obs from 'obsidian';

import Browser, {BROWSER_VIEW} from "./viewport.js";
import SettingsTab, { default_settings, Settings } from "./settings/settingsTab.js";

const AppContext = React.createContext<obs.App | null>(null);

export default class BrowserPlugin extends obs.Plugin {
    settingsTab: SettingsTab | null = null;
    settings: Settings = default_settings;

    async onload() {
        this.registerView(BROWSER_VIEW, leaf => new Browser(leaf, this));
        this.registerExtensions(["html"], BROWSER_VIEW);

        this.addSettingTab(this.settingsTab = new SettingsTab(this.app, this));

        this.settings = await this.loadData()
            .then(res => Object.assign({}, default_settings, res));

        this.addCommand({
            icon: "globe",
            id: "open-new-browser-tab",
            name: "New Browser Tab",
            callback: async () => await this.app.workspace.getLeaf(true).setViewState({ type: BROWSER_VIEW, active: true })
        });
    }

    private runCommand(command: string) {
        (this.app as any as {
            commands: {
                executeCommandById: (command: string) => void
            }
        }).commands.executeCommandById(command);
    }
}