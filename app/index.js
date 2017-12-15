'use strict';

const Http = require('http'),
	  Url = require('url'),
	  Fs = require('fs'),
	  Path = require('path'),
	  Trakt = require('./trakt');

const log = require('./logger');
const user_path = Path.resolve(__dirname, 'state/user.json');
const trakt = new Trakt(process.env.TRAKT_CLIENT_ID, process.env.TRAKT_CLIENT_SECRET, process.env.TRAKT_REDIRECT_URI);

let user;

try {
	user = require(user_path);
} catch (e) {
	log.warn(`${user_path} not found.`);
}

// TODO: Make this a bit more efficient, using shared headers and such
const routes = {
	'/heartbeat': (url, res) => {
		let body = null;

		if (user && user.access_token && (user.created_at + user.expires_in) * 1000 > Date.now()) {
			res.writeHead(200, {'content-type': 'application/json'});
			body = JSON.stringify({
				expires_at: new Date((user.created_at + user.expires_in) * 1000)
			});
		} else {
			res.writeHead(401);
		}

		res.end(body);
	},

	'/auth': (url, res) => {
		trakt.getToken(url.query.code, (err, auth) => {
			trakt.getUserSettings(auth.access_token, (err, settings) => {
				if (settings.user && settings.user.username === process.env.TRAKT_USERNAME) {
					user = auth;

					Fs.writeFileSync(user_path, JSON.stringify(user));

					res.writeHead(200, {'content-type': 'application/json'});
					res.end(JSON.stringify(settings));
					return;
				}

				res.writeHead(401);
				res.end();				
			});
		});
	},

	'/add-movie': (url, res) => {
		if (!url.query.query) {
			res.writeHead(400);
			res.end();
			return;
		}

		if (url.query.access_code !== process.env.ACCESS_CODE) {
			res.writeHead(403);
			res.end();	
			return;
		}

		if (!user.access_token) {
			res.writeHead(401);
			res.end();
			return;
		}

		trakt.searchMovie(encodeURIComponent(url.query.query), (err, movies) => {
			if (err || movies == null || movies.length == 0) {
				res.writeHead(204);
				res.end();
				return;
			}
	
			const body = {
				movies: [
					movies[0].movie
				]
			};
	
			trakt.addMovieToWatchList(user.access_token, body, (err, list) => {
				res.writeHead(200, {'content-type': 'application/json'});
				res.end(JSON.stringify(list));
			});
		});
	},

	'/remove-movie': (url, res) => {
		if (!url.query.query) {
			res.writeHead(400);
			res.end();
			return;
		}

		if (url.query.access_code !== process.env.ACCESS_CODE) {
			res.writeHead(403);
			res.end();
			return;
		}

		if (!user.access_token) {
			res.writeHead(401);
			res.end();
			return;
		}

		trakt.searchMovie(encodeURIComponent(url.query.query), (err, movies) => {
			if (err || movies == null || movies.length == 0) {
				res.writeHead(204);
				res.end();
				return;
			}

			const body = {
				movies: [
					movies[0].movie
				]
			};

			trakt.removeMovieFromWatchList(user.access_token, body, (err, list) => {
				res.writeHead(200, {'content-type': 'application/json'});
				res.end(JSON.stringify(list));
			});
		});
	}
};

const app = Http.createServer((req, res) => {
	const url = Url.parse(req.url, true);
	const route = routes[url.pathname];

	if (!route) {
		res.writeHead(404);
		res.end();	
		return;
	}

	log.debug('Url:', url);

	try {
		route(url, res);
	} catch (e) {
		log.error(e);
		res.writeHead(500);
		res.end();
	}
});

app.listen(80);