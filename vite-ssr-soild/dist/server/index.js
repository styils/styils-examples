import express from 'express';
import createPageRenderer from './page-renderer';
const app = express();
const { clientRoutes, transformEntry } = await createPageRenderer(app);
app
    .use('*', async (req, res, next) => {
    const url = req.originalUrl;
    // if (!clientRoutes.includes(url)) return next()
    res.type('html').end(await transformEntry(url));
})
    .listen(3000, () => console.log(`Server started on http://127.0.0.1:3000 in '${process.env.NODE_ENV}' mode`));
