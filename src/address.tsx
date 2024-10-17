import React from 'react';
import * as obs from 'obsidian';
import * as icons from 'lucide-react';
import type {WebviewTag} from "electron";
import {Readability} from "@mozilla/readability";
import {AppContext} from "./viewport.js";

export default function AddressBar(props: { url: string, webview: React.RefObject<WebviewTag> }) {
    const [url, setUrl] = React.useState(props.url);
    const [isEditingUrl, setIsEditingUrl] = React.useState(false);

    const ref = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => void [ref.current?.focus(), ref.current?.select()], [isEditingUrl, ref]);
    React.useEffect(() => {
        if (ref.current)
            ref.current.value = url;

        ref.current?.addEventListener("change", function (e) {
            setUrl(this.value);
        });
    }, [ref]);

    const location = React.useMemo(() => {
        try {
            return new URL(url);
        } catch (e) {
            const out = new URL("https://duckduckgo.com");
            out.searchParams.set("q", url);
            return out;
        }
    }, [url]);

    React.useEffect(() => {
        props.webview.current?.loadURL(url, {});

        setIsEditingUrl(false);

        setUrl(location.toString());

        if (ref.current)
            ref.current.value = location.toString();
    }, [location]);

    React.useEffect(() => {
        setUrl(props.url);

        if (ref.current)
            ref.current.value = props.url;
    }, [props.url]);

    const app = React.useContext(AppContext);

    return <div className={"url-bar"}>
        <button className={"clickable-icon"} onClick={() => props.webview.current?.goBack()}>
            <icons.ArrowLeft size={14}/>
        </button>
        <button className={"clickable-icon"} onClick={() => props.webview.current?.goForward()}>
            <icons.ArrowRight size={14}/>
        </button>
        <button className={"clickable-icon"} onClick={() => props.webview.current?.reload()}>
            <icons.RefreshCw size={14}/>
        </button>

        <div className={"url-container"}
             onClick={_ => setIsEditingUrl(true)}>
            <div className={["pretty-container", isEditingUrl ? 'hidden' : ''].join(" ")}>
                <span className={"url-part proto"}>{location.protocol.slice(0, -1)}</span>
                <span className={"url-part domain"}>{location.host}</span>
                <span className={"url-part path"}>{location.pathname}</span>
                <span className={"url-part query"}>{location.search.slice(1)}</span>
                <span className={"url-part hash"}>{location.hash.slice(1)}</span>
            </div>
            <input type={"search"}
                   className={["edit", !isEditingUrl ? 'hidden' : ''].join(" ")}
                   ref={ref}
                   onBlur={_ => setIsEditingUrl(false)}
                   autoFocus={true}/>
        </div>

        <button className={"clickable-icon"} onClick={e => app && menu(e, props.webview, app)}>
            <icons.EllipsisVertical size={14}/>
        </button>
    </div>
}

export function menu(e: React.MouseEvent, webview: React.RefObject<WebviewTag>, app: obs.App) {
    const menu = new obs.Menu();

    menu.addItem(item => item
        .setIcon("arrow-left")
        .setTitle("Back")
        .onClick(e => webview.current?.goBack()));

    menu.addItem(item => item
        .setIcon("arrow-right")
        .setTitle("Forward")
        .onClick(e => webview.current?.goForward()));

    menu.addItem(item => item
        .setIcon("refresh-cw")
        .setTitle("Reload")
        .onClick(e => webview.current?.reload()));

    menu.addSeparator();

    menu.addItem(item => item
        .setIcon("zoom-in")
        .setTitle("Zoom In")
        .onClick(e => webview.current?.setZoomFactor(webview.current?.getZoomFactor() * 1.1)));

    menu.addItem(item => item
        .setIcon("zoom-out")
        .setTitle("Zoom Out")
        .onClick(e => webview.current?.setZoomFactor(webview.current?.getZoomFactor() * 0.9)));

    menu.addItem(item => item
        .setIcon("fullscreen")
        .setTitle("Reset Zoom")
        .onClick(e => webview.current?.setZoomFactor(1)));

    menu.addSeparator();

    menu.addItem(item => item
        .setIcon("bookmark-plus")
        .setTitle("Add Bookmark")
        .onClick(e => {}));

    menu.addItem(item => item
        .setIcon("scan-text")
        .setTitle("Extract webpage to note")
        .onClick(e => {
            webview.current?.executeJavaScript(`(function() { return document.body.innerHTML; })();`)
                .then(ok => {
                    const url = new URL(webview.current?.getURL() ?? '');
                    const doc = new DOMParser().parseFromString(ok, "text/html");
                    const article = new Readability(doc, {
                        serializer(element) {
                            const baseProto = url.protocol ?? 'http';
                            if (element instanceof HTMLElement)
                                for (const im of element.querySelectorAll("img")) {
                                    const newUrl = new URL(im.src, url.toString());
                                    newUrl.protocol = baseProto;

                                    im.src = newUrl.toString();
                                }

                            return element as HTMLElement;
                        }
                    }).parse();

                    if (!article?.content)
                        return;

                    const title = (article.title || webview.current?.getTitle() || 'Untitled Webpage Extract') + '.md';
                    const markdown = obs.htmlToMarkdown(article?.content);

                    console.log([title]);

                    app.vault.create(title, markdown).then(file => {
                        const leaf = app.workspace.getLeaf('tab');
                        return leaf.openFile(file);
                    });
                });

        }));

    menu.showAtPosition(e.nativeEvent);
}