import express from 'express';
import { createServer } from 'vite';
import { clientEntry, ssrEntry, clientRoot, isProduction } from './constants';
import { readFile } from 'fs/promises';
const createPageRenderer = async (app) => {
    let vite;
    let render;
    let hydrationScript;
    let template;
    let clientRoutes;
    template = (await readFile(clientEntry)).toString();
    if (!isProduction) {
        vite = await createServer({ root: clientRoot });
        ({ render, clientRoutes, hydrationScript } = await vite.ssrLoadModule(ssrEntry));
        app.use(vite.middlewares);
    }
    else {
        ;
        ({ render, clientRoutes, hydrationScript } = await import(ssrEntry));
        app.use(express.static(clientRoot, { index: false }));
    }
    const transformEntry = async (url) => {
        const { appHtml, extractHtml } = await render(url);
        if (!isProduction)
            template = await vite.transformIndexHtml(url, template);
        return template
            .replace('<!--ssr-outlet-->', appHtml)
            .replace('<!--hydration-script-->', hydrationScript)
            .replace('<!--styils-->', extractHtml);
    };
    return {
        transformEntry,
        clientRoutes
    };
};
export default createPageRenderer;
