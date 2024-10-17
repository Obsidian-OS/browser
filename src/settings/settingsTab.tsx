import * as React from 'react';
import * as rdom from 'react-dom/client';
import * as obs from 'obsidian';

import BrowserPlugin from "../main.js";

export interface Settings {
    home: string
}

export const default_settings: Settings = {
    home: "https://start.duckduckgo.com"
};

export default class SettingsTab extends obs.PluginSettingTab {
    private root: rdom.Root | null = null;

    constructor(readonly app: obs.App, readonly plugin: BrowserPlugin) {
        super(app, plugin);
    }

    display() {
        (this.root = rdom.createRoot(this.containerEl))
            .render(<BrowserSettings tab={this}/>);
    }

    hide() {
        this.root?.unmount();
    }
}

export function BrowserSettings(props: { tab: SettingsTab }) {
    return <div className="browser-settings">

    </div>
}