// Create an API route in pages/api/image-proxy.js
export default async function handler(req, res) {
    const { url } = req.query
    
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch image')
      
      const buffer = await response.arrayBuffer()
      res.setHeader('Content-Type', response.headers.get('content-type'))
      res.send(Buffer.from(buffer))
    } catch (error) {
      // Serve a fallback image
      res.redirect('/placeholder.png')
    }
  }