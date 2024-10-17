import React from 'react';
import * as icons from 'lucide-react';
import {WebviewTag} from "electron";

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
    </div>
}