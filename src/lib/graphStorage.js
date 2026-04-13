/**
 * IndexedDB storage for goal graphs — no size limit unlike localStorage.
 * Simple key-value store: one entry per clientId containing all graph data.
 */

const DB_NAME = 'skillcascade_graphs'
const STORE_NAME = 'graphs'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveGraphs(clientId, graphs) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(graphs, `graphs_${clientId}`)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    console.warn('[graphStorage] Save failed:', e.message)
    return false
  }
}

export async function loadGraphs(clientId) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(`graphs_${clientId}`)
      request.onsuccess = () => resolve(request.result || {})
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    console.warn('[graphStorage] Load failed:', e.message)
    return {}
  }
}

export async function deleteGraphs(clientId) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(`graphs_${clientId}`)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    return false
  }
}
