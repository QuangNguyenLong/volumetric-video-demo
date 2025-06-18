export async function fetchAndParseMpd(mpdUrl) {
    const res = await fetch(mpdUrl);
    if (!res.ok) throw new Error(`Failed to fetch MPD from ${mpdUrl}`);

    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");

    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) throw new Error("MPD XML parse error");

    return xmlDoc;
}

export function extractBandwidthFromMpd(xmlDoc) {
    const ns = "urn:mpeg:dash:schema:mpd:2011";
    const adaptationSets = xmlDoc.getElementsByTagNameNS(ns, "AdaptationSet");

    const result = [];

    for (const adaptationSet of adaptationSets) {
        const representations = adaptationSet.getElementsByTagNameNS(ns, "Representation");
        const bandwidths = [];

        for (const rep of representations) {
            const bw = rep.getAttribute("bandwidth");
            if (bw !== null) {
                bandwidths.push(parseInt(bw, 10));
            }
        }

        result.push(bandwidths);
    }

    return result;
}