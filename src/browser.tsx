import React from 'react';
import type {WebviewTag} from 'electron';

import {Settings} from "./settings/settingsTab.js";
import Browser from "./viewport.js";
import AddressBar from "./address.js";

export default function Ui(props: { browser: Browser, settings: Settings }) {
    const ref = React.createRef<WebviewTag>();
    const [state, setState] = React.useState(props.browser.getState());

    React.useEffect(() => {
        if (!ref.current) return;

        ref.current.addEventListener("page-title-updated", e => setState(prev => ({
            ...prev,
            title: e.title
        })));
        ref.current.addEventListener("page-favicon-updated", e => setState(prev => ({
            ...prev,
            favicon: e.favicons[0] ?? null
        })));
        ref.current.addEventListener("did-navigate", e => setState(prev => ({
            ...prev,
            url: e.url
        })))
    }, []);

    React.useEffect(() => void props.browser.setState({ ...state }, { history: true }), [state]);

    return <section className={"webview-viewport"}>
        <AddressBar url={state.url} webview={ref}/>
        <webview ref={ref} src={props.browser.getState().url}/>
    </section>
}