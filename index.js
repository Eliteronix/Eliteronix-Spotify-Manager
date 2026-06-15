require('dotenv').config();

let spotifyToken = null;
let spotifySavedTracks = [];
let duplicateIndexes = [];
let spotifyArchivePlaylistTracks = [];
let spotifyArchiveTracksToRemove = [];
let removedDuplicates = false;

(async () => {
	await getSpotifyPlaylist(process.env.SPOTIFY_ARCHIVE_PLAYLIST_ID);

	await getSavedSpotifyTracks();

	// eslint-disable-next-line no-console
	console.log(`Total saved tracks fetched from Spotify: ${spotifySavedTracks.length}`);

	let trackData = [];

	for (let i = 0; i < spotifySavedTracks.length; i++) {
		let item = spotifySavedTracks[i];

		trackData.push({ index: i, track: `${item.track.artists.map(artist => artist.name).join(', ')} - ${item.track.name}` });

		let duplicateTracks = trackData.filter(t => t.track === trackData[i].track);

		if (duplicateTracks.length > 1) {
			duplicateTracks.forEach(dup => {
				if (!duplicateIndexes.includes(dup.index) && dup.index !== i) {
					duplicateIndexes.push(dup.index);
				}
			});
		}
	}

	if (duplicateIndexes.length > 0) {
		// eslint-disable-next-line no-console
		console.log(`Found ${duplicateIndexes.length} duplicate tracks in your saved Spotify tracks:`);

		duplicateIndexes.sort((a, b) => a - b);

		for (let i = 0; i < duplicateIndexes.length; i++) {
			let item = spotifySavedTracks[duplicateIndexes[i]];
			// eslint-disable-next-line no-console
			console.log(`[Index ${duplicateIndexes[i]}] ${item.track.artists.map(artist => artist.name).join(', ')} - ${item.track.name}`);

			if (!spotifyToken) {
				await getSpotifyToken();
			}

			// Delete the duplicate track from saved tracks
			const deleteUrl = `https://api.spotify.com/v1/me/library?uris=${item.track.uri}`;

			await fetch(deleteUrl, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${spotifyToken}`,
				},
			}).then(async (response) => {
				if (response.status === 200 || response.status === 204) {
					// eslint-disable-next-line no-console
					console.log('   Successfully deleted duplicate track from saved tracks.');
				} else {
					// eslint-disable-next-line no-console
					console.log(`   Failed to delete duplicate track. Status code: ${response.status}`);
				}
			});
		}

		removedDuplicates = true;
	} else {
		// eslint-disable-next-line no-console
		console.log('No duplicate tracks found in your saved Spotify tracks.');
	}

	for (let i = 0; i < spotifyArchivePlaylistTracks.length; i++) {
		let item = spotifyArchivePlaylistTracks[i];

		let trackInfo = `${item.track.artists.map(artist => artist.name).join(', ')} - ${item.track.name}`;

		let savedTrack = trackData.filter(t => t.track === trackInfo);

		if (savedTrack.length > 0) {
			spotifyArchiveTracksToRemove.push(item);
		}
	}

	if (spotifyArchiveTracksToRemove.length > 0) {
		// eslint-disable-next-line no-console
		console.log(`Found ${spotifyArchiveTracksToRemove.length} already liked tracks in your archive playlist:`);

		spotifyArchiveTracksToRemove.sort((a, b) => a - b);

		for (let i = 0; i < spotifyArchiveTracksToRemove.length; i++) {
			let item = spotifyArchiveTracksToRemove[i];
			// eslint-disable-next-line no-console
			console.log(`[Index ${i}] ${item.track.artists.map(artist => artist.name).join(', ')} - ${item.track.name}`);

			if (!spotifyToken) {
				await getSpotifyToken();
			}

			// Delete the duplicate track from archive playlist
			const deleteUrl = `https://api.spotify.com/v1/playlists/${process.env.SPOTIFY_ARCHIVE_PLAYLIST_ID}/items`;

			let body = JSON.stringify({
				'items': [
					{
						'uri': item.track.uri
					}
				]
			});

			await fetch(deleteUrl, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${spotifyToken}`,
					'Content-Type': 'application/json',
				},
				body: body,
			}).then(async (response) => {
				if (response.status === 200 || response.status === 204) {
					// eslint-disable-next-line no-console
					console.log('   Successfully deleted liked track from archive playlist.');
				} else {
					// eslint-disable-next-line no-console
					console.log(`   Failed to delete liked track. Status code: ${response.status}`);
				}
			});
		}

		removedDuplicates = true;
	} else {
		// eslint-disable-next-line no-console
		console.log('No already liked tracks found in your archive playlist.');
	}

	if (!removedDuplicates) {
		// Kill the process if no duplicates are found after 5 seconds
		setTimeout(() => {
			process.exit(0);
		}, 5000);
	}
})().catch(console.error);

async function getSavedSpotifyTracks(offset = 0, limit = 50) {
	if (!spotifyToken) {
		await getSpotifyToken();
	}

	const searchParams = new URLSearchParams({
		limit: limit.toString(),
		offset: offset.toString(),
	});

	const searchUrl = `https://api.spotify.com/v1/me/tracks?${searchParams.toString()}`;

	await fetch(searchUrl, {
		headers: {
			'Authorization': `Bearer ${spotifyToken}`,
		},
	}).then(async (response) => {
		let json = await response.json();

		spotifySavedTracks = spotifySavedTracks.concat(json.items);

		// eslint-disable-next-line no-console
		console.log(`Fetched ${spotifySavedTracks.length} saved tracks from Spotify so far.`);

		if (json.total > limit + offset) {
			await getSavedSpotifyTracks(offset + limit, limit);
		}
	});
}

async function getSpotifyPlaylist(playlistId, offset = 0, limit = 50) {
	if (!spotifyToken) {
		await getSpotifyToken();
	}

	const searchParams = new URLSearchParams({
		limit: limit.toString(),
		offset: offset.toString(),
	});

	const searchUrl = `https://api.spotify.com/v1/playlists/${playlistId}/items?${searchParams.toString()}`;

	await fetch(searchUrl, {
		headers: {
			'Authorization': `Bearer ${spotifyToken}`,
		},
	}).then(async (response) => {
		let json = await response.json();

		spotifyArchivePlaylistTracks = spotifyArchivePlaylistTracks.concat(json.items);

		// eslint-disable-next-line no-console
		console.log(`Fetched ${spotifyArchivePlaylistTracks.length} tracks from the archive playlist so far.`);

		if (json.total > limit + offset) {
			await getSpotifyPlaylist(playlistId, offset + limit, limit);
		}
	});
}

async function getSpotifyToken() {
	const url = new URL(
		'https://accounts.spotify.com/api/token'
	);

	const headers = {
		'Authorization': 'Basic ' + (new Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')),
		'Content-Type': 'application/x-www-form-urlencoded',
	};

	let body = `grant_type=refresh_token&refresh_token=${process.env.SPOTIFY_AUTHORIZATION_REFRESH_TOKEN}`;

	await fetch(url, {
		method: 'POST',
		headers,
		body: body,
	}).then(async (response) => {
		let json = await response.json();

		spotifyToken = json.access_token;

		setTimeout(() => {
			spotifyToken = null;
		}, json.expires_in * 1000);
	});
}