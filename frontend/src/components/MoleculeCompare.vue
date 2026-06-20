<template>
  <div v-if="store.showCompareModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" @click.self="store.closeCompare()">
    <div class="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between px-5 py-3 border-b border-slate-700">
        <div>
          <h3 class="text-lg font-bold text-cyan-400">分子对比</h3>
          <p class="text-xs text-slate-500">并排比较 {{ store.compareData.length }} 个候选分子 · 结构特征 · 关键性质 · 相似度</p>
        </div>
        <div class="flex gap-2">
          <button @click="onClear" class="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200">清空</button>
          <button @click="store.closeCompare()" class="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200">关闭 ✕</button>
        </div>
      </div>
      <div v-if="store.compareData.length < 2" class="p-10 text-center text-slate-500">
        请至少选择 2 个分子进行对比
      </div>
      <div v-else class="overflow-auto p-4">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-slate-600">
              <th class="sticky left-0 bg-slate-800 text-left text-slate-400 p-2 w-40">指标</th>
              <th v-for="entry in store.compareData" :key="entry.molecule.id" class="p-2 min-w-[180px] align-top">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-cyan-400 font-bold">{{ entry.molecule.name }}</span>
                  <button @click="store.removeFromCompare(entry.molecule.id)" class="text-slate-500 hover:text-red-400">✕</button>
                </div>
                <div class="text-xs text-slate-500 font-mono">{{ entry.molecule.formula }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr><td :colspan="store.compareData.length + 1" class="bg-slate-900 text-cyan-300 font-bold p-2">结构特征</td></tr>
            <tr v-for="row in structureRows" :key="row.key" class="border-b border-slate-700/50">
              <td class="sticky left-0 bg-slate-800 text-slate-400 p-2 whitespace-nowrap">{{ row.label }}</td>
              <td v-for="entry in store.compareData" :key="entry.molecule.id" class="p-2 break-words" :class="cellClass(row, entry)">
                {{ formatValue(row, entry) }}
              </td>
            </tr>
            <tr><td :colspan="store.compareData.length + 1" class="bg-slate-900 text-cyan-300 font-bold p-2">关键性质 (ADMET)</td></tr>
            <tr v-for="row in propertyRows" :key="row.key" class="border-b border-slate-700/50">
              <td class="sticky left-0 bg-slate-800 text-slate-400 p-2 whitespace-nowrap">{{ row.label }}</td>
              <td v-for="entry in store.compareData" :key="entry.molecule.id" class="p-2 break-words" :class="cellClass(row, entry)">
                {{ formatValue(row, entry) }}
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="store.compareData.length >= 2" class="mt-5">
          <h4 class="text-sm font-bold text-slate-400 mb-2">相似度矩阵 (Tanimoto, %)</h4>
          <table class="text-sm border-collapse">
            <thead>
              <tr>
                  <th class="p-2"></th>
                  <th v-for="entry in store.compareData" :key="entry.molecule.id" class="p-2 text-cyan-400 font-bold">{{ entry.molecule.name }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in store.similarityMatrix" :key="i">
                  <td class="p-2 text-cyan-400 font-bold">{{ row[0].rowName }}</td>
                  <td v-for="cell in row" :key="cell.colId" class="p-2 text-center font-mono" :style="cellStyle(cell.value)">
                    {{ cell.value }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </template>

<script setup lang="ts">
import { useCompareStore } from '../store/compare'
import type { CompareEntry } from '../types'

const store = useCompareStore()

interface RowDef {
  key: string
  label: string
  kind: 'structure' | 'property'
  field: string
}
const structureRows: RowDef[] = [
  { key: 'formula', label: '分子式', kind: 'structure', field: 'formula' },
  { key: 'mw', label: '分子量 (MW)', kind: 'structure', field: 'mw' },
  { key: 'category', label: '类别', kind: 'structure', field: 'category' },
  { key: 'atomCount', label: '原子总数', kind: 'structure', field: 'atomCount' },
  { key: 'heavyAtomCount', label: '重原子数', kind: 'structure', field: 'heavyAtomCount' },
  { key: 'bondCount', label: '化学键数', kind: 'structure', field: 'bondCount' },
  { key: 'doubleBondCount', label: '双键数', kind: 'structure', field: 'doubleBondCount' },
  { key: 'tripleBondCount', label: '三键数', kind: 'structure', field: 'tripleBondCount' },
  { key: 'aromaticAtomCount', label: '芳香原子数', kind: 'structure', field: 'aromaticAtomCount' },
  { key: 'ringCount', label: '环数', kind: 'structure', field: 'ringCount' },
  { key: 'halogenCount', label: '卤素原子数', kind: 'structure', field: 'halogenCount' },
  { key: 'heteroAtomCount', label: '杂原子数', kind: 'structure', field: 'heteroAtomCount' },
  { key: 'hbd', label: '氢键供体 (HBD)', kind: 'structure', field: 'hbd' },
  { key: 'hba', label: '氢键受体 (HBA)', kind: 'structure', field: 'hba' }
]
const propertyRows: RowDef[] = [
  { key: 'logP', label: 'LogP (脂水性)', kind: 'property', field: 'logP' },
  { key: 'logS', label: 'LogS (溶解度)', kind: 'property', field: 'logS' },
  { key: 'toxicity', label: '毒性等级', kind: 'property', field: 'toxicity' },
  { key: 'proteinBinding', label: '蛋白结合率', kind: 'property', field: 'proteinBinding' },
  { key: 'bioavailability', label: '生物利用度', kind: 'property', field: 'bioavailability' },
  { key: 'metabolicStability', label: '代谢稳定性', kind: 'property', field: 'metabolicStability' },
  { key: 'ruleOfFive', label: 'Lipinski 五规则', kind: 'property', field: 'ruleOfFive' }
]
function numValue(row: RowDef, entry: CompareEntry): number | null {
  if (row.field === 'mw') return entry.molecule.mw
  if (row.field === 'formula') return null
  if (row.field === 'category') return null
  if (row.kind === 'structure') {
    const v = (entry.structure as any)[row.field]
    return typeof v === 'number' ? v : null
  }
  const v = (entry.admet as any)[row.field]
  return typeof v === 'number' ? v : null
}
const lowerBetter = new Set(['logP', 'logS', 'proteinBinding', 'hbd', 'hba'])

function cellClass(row: RowDef, entry: CompareEntry): string {
  const vals = store.compareData.map(e => numValue(row, e)).filter((v): v is number => v !== null)
  if (vals.length === 0) return ''
  const v = numValue(row, entry)
  if (v === null) return ''
  const best = lowerBetter.has(row.field)
    ? vals.reduce((a, b) => (a < b ? a : b))
    : vals.reduce((a, b) => (a > b ? a : b))
  return v === best ? 'bg-cyan-500/20 font-bold text-cyan-300' : ''
}
function formatValue(row: RowDef, entry: CompareEntry): string {
  if (row.field === 'formula') return entry.molecule.formula
  if (row.field === 'mw') return entry.molecule.mw.toFixed(2)
  if (row.field === 'category') return entry.molecule.category
  if (row.kind === 'structure') {
    const v = (entry.structure as any)[row.field]
    return v !== undefined ? String(v) : '-'
  }
  const v = (entry.admet as any)[row.field]
  if (typeof v === 'number') return v.toFixed(2)
  return v !== undefined ? String(v) : '-'
}
function cellStyle(value: number): Record<string, string> {
  const t = Math.max(0, Math.min(100, value)) / 100
  return { backgroundColor: 'rgba(34, 211, 238, ' + (t * 0.5).toFixed(3) + ')' }
}

function onClear() {
  store.clearCompare()
}
</script>
