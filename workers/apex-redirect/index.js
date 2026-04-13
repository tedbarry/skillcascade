export default {
  async fetch(request) {
    const url = new URL(request.url)
    url.hostname = 'www.skillcascade.com'
    return Response.redirect(url.toString(), 308)
  },
}
