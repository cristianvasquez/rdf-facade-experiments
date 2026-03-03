import ExcelJS from 'exceljs'
import rdf from 'rdf-ext'
import { ns } from './namespaces.js'

// ExcelJS ValueType enum → string label (from ExcelJS.ValueType constants)
const TYPE_MAP = {
  0: 'null',       // Null
  1: 'string',     // Merge  — merged cell, value is a plain string
  2: 'number',     // Number
  3: 'string',     // String
  4: 'date',       // Date
  5: 'hyperlink',  // Hyperlink
  6: 'formula',    // Formula
  7: 'string',     // SharedString — stored as plain string at runtime
  8: 'richText',   // RichText — {richText: [{text, font?}, …]}
  9: 'boolean',    // Boolean
  10: 'error',     // Error
}

/**
 * Extracts a plain string from any ExcelJS cell value.
 * Handles RichText objects ({richText: [{text}]}) by concatenating segments.
 */
function cellValueToString(rawValue) {
  if (rawValue === null || rawValue === undefined) return ''
  if (typeof rawValue === 'object' && Array.isArray(rawValue.richText)) {
    return rawValue.richText.map(seg => seg.text ?? '').join('')
  }
  return String(rawValue)
}

/**
 * Converts a loaded ExcelJS Workbook to an array of RDF quads.
 *
 * @param {import('exceljs').Workbook} workbook
 * @param {object} options
 * @param {boolean}  [options.useNamedNodes=false]  Use named nodes instead of blank nodes
 * @param {string}   [options.baseUri='http://example.org/xls#']
 * @param {string[]} [options.includeStyleProps=['bold','fillColor']]  Which style attrs to extract
 * @returns {Array} Array of RDF quads
 */
function workbookToRdf(workbook, options = {}) {
  const {
    useNamedNodes = false,
    baseUri = 'http://example.org/xls#',
    includeStyleProps = ['bold', 'fillColor'],
  } = options

  const quads = []
  let counter = 0

  function newNode(label) {
    return useNamedNodes
      ? rdf.namedNode(`${baseUri}${label}-${counter++}`)
      : rdf.blankNode()
  }

  function lit(value, datatype) {
    return datatype
      ? rdf.literal(String(value), rdf.namedNode(datatype))
      : rdf.literal(String(value))
  }

  const workbookNode = newNode('workbook')
  quads.push(rdf.quad(workbookNode, rdf.namedNode(ns.rdf.type), rdf.namedNode(ns.xls('Workbook'))))

  workbook.eachSheet((worksheet) => {
    const sheetNode = newNode('sheet')

    quads.push(rdf.quad(workbookNode, rdf.namedNode(ns.xls('sheet')), sheetNode))
    quads.push(rdf.quad(sheetNode, rdf.namedNode(ns.rdf.type), rdf.namedNode(ns.xls('Sheet'))))
    quads.push(rdf.quad(sheetNode, rdf.namedNode(ns.xls('name')), lit(worksheet.name, ns.xsd('string'))))

    // Merge regions — linked directly to the sheet
    for (const range of (worksheet.model?.merges ?? [])) {
      const [startAddr, endAddr] = range.split(':')
      const startCell = worksheet.getCell(startAddr)
      const endCell   = worksheet.getCell(endAddr)
      const rawValue  = startCell.value?.result ?? startCell.value
      if (rawValue === null || rawValue === undefined) continue

      const mergeNode = newNode('merge')
      quads.push(rdf.quad(sheetNode, rdf.namedNode(ns.xls('mergeRegion')), mergeNode))
      quads.push(rdf.quad(mergeNode, rdf.namedNode(ns.rdf.type),   rdf.namedNode(ns.xls('MergeRegion'))))
      quads.push(rdf.quad(mergeNode, rdf.namedNode(ns.xls('startX')), lit(startCell.col, ns.xsd('integer'))))
      quads.push(rdf.quad(mergeNode, rdf.namedNode(ns.xls('endX')),   lit(endCell.col,   ns.xsd('integer'))))
      quads.push(rdf.quad(mergeNode, rdf.namedNode(ns.xls('startY')), lit(startCell.row, ns.xsd('integer'))))
      quads.push(rdf.quad(mergeNode, rdf.namedNode(ns.xls('endY')),   lit(endCell.row,   ns.xsd('integer'))))
      quads.push(rdf.quad(mergeNode, rdf.namedNode(ns.xls('value')),  lit(cellValueToString(rawValue))))
    }

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        // Unwrap formula result if present
        const rawValue = cell.value?.result ?? cell.value
        if (rawValue === null || rawValue === undefined) return

        if (cell.type === 1) return          // skip slave cells of a merge region (handled via xls:MergeRegion)
        const typeLabel = TYPE_MAP[cell.type] ?? 'unknown'
        if (typeLabel === 'null') return

        const cellNode = newNode('cell')

        quads.push(rdf.quad(sheetNode, rdf.namedNode(ns.xls('cell')), cellNode))
        quads.push(rdf.quad(cellNode, rdf.namedNode(ns.rdf.type), rdf.namedNode(ns.xls('Cell'))))
        quads.push(rdf.quad(cellNode, rdf.namedNode(ns.xls('x')), lit(colNumber, ns.xsd('integer'))))
        quads.push(rdf.quad(cellNode, rdf.namedNode(ns.xls('y')), lit(rowNumber, ns.xsd('integer'))))
        quads.push(rdf.quad(cellNode, rdf.namedNode(ns.xls('dataType')), lit(typeLabel)))

        // Emit value with appropriate XSD type
        if (typeLabel === 'number') {
          quads.push(rdf.quad(cellNode, rdf.namedNode(ns.xls('value')), lit(rawValue, ns.xsd('decimal'))))
        } else if (typeLabel === 'boolean') {
          quads.push(rdf.quad(cellNode, rdf.namedNode(ns.xls('value')), lit(rawValue, ns.xsd('boolean'))))
        } else if (typeLabel === 'date' && rawValue instanceof Date) {
          quads.push(rdf.quad(cellNode, rdf.namedNode(ns.xls('value')), lit(rawValue.toISOString(), ns.xsd('dateTime'))))
        } else {
          quads.push(rdf.quad(cellNode, rdf.namedNode(ns.xls('value')), lit(cellValueToString(rawValue))))
        }

        // Style sub-node — only emitted when there is actual style data
        const styleTriples = []

        if (includeStyleProps.includes('bold') && cell.font?.bold === true) {
          styleTriples.push([ns.xls('bold'), lit(true, ns.xsd('boolean'))])
        }

        if (includeStyleProps.includes('fillColor')) {
          const argb = cell.fill?.fgColor?.argb
          if (argb) {
            // Convert ARGB to #RRGGBB (drop alpha channel prefix)
            const hex = argb.length === 8 ? `#${argb.slice(2)}` : `#${argb}`
            styleTriples.push([ns.xls('fillColor'), lit(hex)])
          }
        }

        if (styleTriples.length > 0) {
          const styleNode = newNode('style')
          quads.push(rdf.quad(cellNode, rdf.namedNode(ns.xls('style')), styleNode))
          for (const [pred, obj] of styleTriples) {
            quads.push(rdf.quad(styleNode, rdf.namedNode(pred), obj))
          }
        }
      })
    })
  })

  return quads
}

/**
 * Reads an Excel file and returns RDF quads.
 *
 * @param {string} filePath  Absolute or relative path to .xlsx file
 * @param {object} options   Same options as workbookToRdf
 * @returns {Promise<Array>} Array of RDF quads
 */
async function excelToRdf(filePath, options = {}) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)
  return workbookToRdf(workbook, options)
}

export { excelToRdf, workbookToRdf }
