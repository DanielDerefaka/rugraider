export default function myImageLoader({ src, width, quality }) {
    // You can add error handling or fallback logic here
    return `${src}?w=${width}&q=${quality || 75}`
  }