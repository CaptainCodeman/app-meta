declare global {
  interface DocumentEventMap {
    'app-metadata': CustomEvent<Metadata>
  }
}

export function addMetadataListener() {
  document.addEventListener('app-metadata', OnAppMetadata)
}

function OnAppMetadata(e: CustomEvent<Metadata>) {
  updateMetadata(e.detail)
}

export type Metadata = { [key: string]: string }

export type MetadataEntry = { key: string, value: string }

export function updateMetadata(data: Metadata, entries?: MetadataEntry[][] ) {
  syncMedatadata({ ...data, url: data.url || document.location.href }, entries)
}

const head = document.head

function syncMedatadata(data: Metadata, entries?: MetadataEntry[][]) {
  const keys = Object.keys(data)

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const value = data[key]

    switch (key) {
      case 'title':
        document.title = value
        break;
      default:
        setMetaValue(0, key, value)
        break
    }

    switch (key) {
      case 'title':
      case 'description':
      case 'image':
      case 'url':
        setMetaValue(0, 'og:' + key, value)
        setMetaValue(0, 'twitter:' + key, value)
        break
    }
  }

  if (entries) {
    for (let i = 0; i < entries.length; i++) {
      const set = entries[i]
      for (let j = 0; j < set.length; j++) {
        const entry = set[j]
        setMetaValue(i, entry.key, entry.value)
      }
    }
  }

  cleanupUnused()
}

// keep track of added meta elements so that
// they can be reused or removed as required
type metaMap = { [key: string]: HTMLMetaElement[] }
const metaElements: metaMap = {}

const propertyPrefixes = ['fb', 'og', 'product']

function getAttrName(key: string) {
  const parts = key.split(':')
  return parts.length === 1 || propertyPrefixes.indexOf(parts[0]) === -1
    ? 'name'
    : 'property'
}

function setMetaValue(index: number, key: string, value: string) {
  const attrName = getAttrName(key)

  let element: HTMLMetaElement | undefined
  let elements = metaElements[key]
  if (elements) {
    element = elements[index]
  } else {
    elements = []
    metaElements[key] = elements
  }

  if (element) {
    element.content = value
  } else {
    const selector = `meta[${attrName}="${key}"]`

    let element = index
      ? <HTMLMetaElement>head.querySelectorAll(selector)[index]
      : <HTMLMetaElement>head.querySelector(selector)

    if (!element) {
      // otherwise create a new element
      element = document.createElement('meta')
      element.setAttribute(attrName, key)
      head.appendChild(element)
    }

    element.content = value
    elements[index] = element
  }

  updated[key] = index + 1
}

// count of updated metadata used in each iteration
let updated : { [key: string]: number } = {}

// cleanup previously existing metatags that are now unused
function cleanupUnused() {
  const keys = Object.keys(metaElements)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const elements = metaElements[key]
    const used = updated[key] || 0
    if (elements.length > used) {
      for (let n = used; n < elements.length; n++) {
        head.removeChild(elements[n])
      }
      elements.splice(used)
    }
  }

  // reset for next time
  updated = {}
}