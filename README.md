This repo helps you automatically identify and remove duplicate liked songs in Spotify 

Getting the spotify token with enough rights:

1. Create client https://developer.spotify.com/dashboard

2. Open this in browser (Make sure the callback uri is added as a valid uri in the app on developers in spotify):
https://accounts.spotify.com/authorize?client_id=<CLIENT_ID>&response_type=code&redirect_uri=http://127.0.0.1:8888/callback&scope=user-modify-playback-state%20user-read-playback-state%20user-library-read%20user-library-modify

3. Copy the code from the result in the URL bar

4. Use this in Powershell:
$base64 = [Convert]::ToBase64String(
    [Text.Encoding]::ASCII.GetBytes("<CLIENT_ID>:<CLIENT_SECRET>")
)

$response = Invoke-WebRequest -UseBasicParsing -Method POST "https://accounts.spotify.com/api/token" `
  -Headers @{ Authorization = "Basic $base64" } `
  -Body "grant_type=authorization_code&code=<CODE>&redirect_uri=http://127.0.0.1:8888/callback"

$response.Content

5. Keep the refresh-token to refresh the access in the code
