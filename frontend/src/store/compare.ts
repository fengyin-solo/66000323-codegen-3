import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMoleculeStore, computeADMET } from './molecule'
import type { MoleculeData, StructureFeatures, CompareEntry, SimilarityCell } from '../types'

export const MAX_COMPARE = 4
const HALOGENS = ['F', 'Cl', 'Br', 'I']
const MAX_PATH_LEN = 7

function bondSymbol(order: number): string {
  if (order === 2) return '='
  if (order === 3) return '#'
  return '-'
}

interface Neighbor { neighbor: number; order: number }

function buildAdjacency(mol: MoleculeData): Neighbor[][] {
  const adj: Neighbor[][] = mol.atoms.map(() => [])
  for (const b of mol.bonds) {
    adj[b.atom1].push({ neighbor: b.atom2, order: b.order })
    adj[b.atom2].push({ neighbor: b.atom1, order: b.order })
  }
  return adj
}

export function getPathFingerprint(mol: MoleculeData): Set<string> {
  const adj = buildAdjacency(mol)
  const fp = new Set<string>()
  for (let i = 0; i < mol.atoms.length; i++) {
    fp.add(mol.atoms[i].element)
  }
  const visited = new Set<number>()
  function dfs(node: number, path: string, depth: number) {
    if (depth > MAX_PATH_LEN) return
    if (depth >= 1) {
      const rev = path.split('').reverse().join('')
      fp.add(path < rev ? path : rev)
    }
    for (const nb of adj[node]) {
      if (!visited.has(nb.neighbor)) {
        visited.add(nb.neighbor)
        const next = path + bondSymbol(nb.order) + mol.atoms[nb.neighbor].element
        dfs(nb.neighbor, next, depth + 1)
        visited.delete(nb.neighbor)
      }
    }
  }
  for (let s = 0; s < mol.atoms.length; s++) {
    visited.add(s)
    dfs(s, mol.atoms[s].element, 0)
    visited.delete(s)
  }
  return fp
}

export function computeMolecularTanimoto(mol1: MoleculeData, mol2: MoleculeData): number {
  const fp1 = getPathFingerprint(mol1)
  const fp2 = getPathFingerprint(mol2)
  let inter = 0
  fp1.forEach(p => { if (fp2.has(p)) inter++ })
  const union = fp1.size + fp2.size - inter
  if (union === 0) return 0
  return Math.round((inter / union) * 1000) / 10
}

export function computeTanimoto(smiles1: string, smiles2: string): number {
  const set1 = new Set(smiles1.split(''))
  const set2 = new Set(smiles2.split(''))
  let intersection = 0
  set1.forEach(s => { if (set2.has(s)) intersection++ })
  const union = set1.size + set2.size - intersection
  return union === 0 ? 0 : Math.round((intersection / union) * 1000) / 10
}

function countRings(smiles: string): number {
  const digits = smiles.match(/\d/g) || []
  const unique = new Set(digits)
  let rings = 0
  unique.forEach(d => {
    const c = (smiles.match(new RegExp(d, 'g')) || []).length
    rings += Math.floor(c / 2)
  })
  return rings
}

export function computeStructureFeatures(mol: MoleculeData): StructureFeatures {
  const elementComposition: Record<string, number> = {}
  mol.atoms.forEach(a => {
    elementComposition[a.element] = (elementComposition[a.element] || 0) + 1
  })
  const atomCount = mol.atoms.length
  const heavyAtomCount = mol.atoms.filter(a => a.element !== 'H').length
  const bondCount = mol.bonds.length
  const doubleBondCount = mol.bonds.filter(b => b.order === 2).length
  const tripleBondCount = mol.bonds.filter(b => b.order === 3).length
  const aromaticAtomCount = (mol.smiles.match(/[cnops]/g) || []).length
  const ringCount = countRings(mol.smiles)
  const halogenCount = mol.atoms.filter(a => HALOGENS.includes(a.element)).length
  const heteroAtomCount = mol.atoms.filter(a => a.element !== 'C' && a.element !== 'H').length
  const hbd = (mol.formula.match(/O/g) || []).length
  const hba = (mol.formula.match(/N/g) || []).length + hbd
  return {
    atomCount, heavyAtomCount, bondCount, doubleBondCount, tripleBondCount,
    aromaticAtomCount, ringCount, halogenCount, heteroAtomCount, hbd, hba,
    elementComposition
  }
}

export const useCompareStore = defineStore('compare', () => {
  const molStore = useMoleculeStore()
  const compareIds = ref<number[]>([])
  const showCompareModal = ref(false)

  const compareList = computed<MoleculeData[]>(() =>
    compareIds.value
      .map(id => molStore.molecules.find(m => m.id === id))
      .filter((m): m is MoleculeData => !!m)
  )

  const compareData = computed<CompareEntry[]>(() =>
    compareList.value.map(m => ({
      molecule: m,
      structure: computeStructureFeatures(m),
      admet: computeADMET({ mw: m.mw, logP: m.logP, formula: m.formula })
    }))
  )

  const similarityMatrix = computed<SimilarityCell[][]>(() => {
    const list = compareList.value
    return list.map(row => list.map(col => ({
      rowId: row.id, colId: col.id, rowName: row.name, colName: col.name,
      value: row.id === col.id ? 100 : computeMolecularTanimoto(row, col)
    })))
  })

  function isInCompare(id: number): boolean {
    return compareIds.value.includes(id)
  }

  function toggleCompare(mol: MoleculeData) {
    const idx = compareIds.value.indexOf(mol.id)
    if (idx >= 0) {
      compareIds.value.splice(idx, 1)
    } else if (compareIds.value.length < MAX_COMPARE) {
      compareIds.value.push(mol.id)
    }
  }

  function removeFromCompare(id: number) {
    compareIds.value = compareIds.value.filter(i => i !== id)
  }

  function clearCompare() {
    compareIds.value = []
  }

  function openCompare() {
    if (compareIds.value.length >= 2) showCompareModal.value = true
  }

  function closeCompare() {
    showCompareModal.value = false
  }

  return {
    compareIds, showCompareModal,
    compareList, compareData, similarityMatrix,
    isInCompare, toggleCompare, removeFromCompare, clearCompare, openCompare, closeCompare
  }
})
