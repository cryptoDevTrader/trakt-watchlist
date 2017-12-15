'use strict';

const Https = require('https');
const log = require('./logger');

class Trakt {
	constructor(client_id, client_secret, redirect_uri) {
		this.client_id = client_id;
		this.client_secret = client_secret;
		this.redirect_uri = redirect_uri;
	}

	makeRequest(options, callback) {
	const data = options.data || '';

	options = options.url || options;        

	log.debug('Options:', JSON.stringify(options));

		const req = Https.request(options, (res) => {
			let body = '';

			log.debug('Status:', res.statusCode);
			log.debug('Headers:', JSON.stringify(res.headers));

			res.setEncoding('utf8');

			res.on('data', (chunk) => body += chunk);

			res.on('end', () => {
				const content_type = res.headers['content-type'];

				if (content_type && content_type.match(/application\/(hal\+)?json/)) {
					body = JSON.parse(body);
				}

				log.debug('Response:', body);
				log.debug('==================================================');

				callback(null, body);
			});
		}).on('error', callback);

		req.write(JSON.stringify(data));
		req.end();
	}

	getToken(code, callback) {
		this.makeRequest({
			'method': 'POST',
			'hostname': 'api.trakt.tv',
			'path': '/oauth/token',
			'headers': {
				'content-type': 'application/json'
			},
			data: {
				code: code,
				client_id: this.client_id,
				client_secret: this.client_secret,
				redirect_uri: this.redirect_uri,
				grant_type: 'authorization_code'
			}
		}, callback);
	}

	getUserSettings(access_token, callback) {
		this.makeRequest({
			'method': 'GET',
			'hostname': 'api.trakt.tv',
			'path': '/users/settings',
			'headers': {
				'content-type': 'application/json',
				'trakt-api-version': '2',
		'trakt-api-key': this.client_id,
		'authorization': `Bearer ${access_token}`
			}
		}, callback);
	}

	searchMovie(query, callback) {
		this.makeRequest({
			'method': 'GET',
			'hostname': 'api.trakt.tv',
			'path': `/search/movie?query=${query}`,
			'headers': {
				'content-type': 'application/json',
				'trakt-api-version': '2',
				'trakt-api-key': this.client_id
			}
		}, callback);
    	}

    	addMovieToWatchList(access_token, data, callback) {
		this.makeRequest({
			method: 'POST',
			hostname: 'api.trakt.tv',
	    		path: `/sync/watchlist`,
	    		data: data,
			headers: {
				'content-type': 'application/json',
				'trakt-api-version': '2',
				'trakt-api-key': this.client_id,
				'authorization': `Bearer ${access_token}`
			},
		}, callback);
	}

	removeMovieFromWatchList(access_token, data, callback) {
		this.makeRequest({
			method: 'POST',
			hostname: 'api.trakt.tv',
			path: `/sync/watchlist/remove`,
			data: data,
			headers: {
				'content-type': 'application/json',
				'trakt-api-version': '2',
				'trakt-api-key': this.client_id,
				'authorization': `Bearer ${access_token}`
			},
		}, callback);
	}
}

module.exports = Trakt;