import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

/**
 * TableDebugWrapper - Development-only logging wrapper for DataGrid
 * Logs diagnostic information about records and data flow
 * 
 * @param {Object} props
 * @param {Array} props.records - The records being passed to the table
 * @param {string} props.title - Title/name for logging context
 * @param {boolean} props.debugEnabled - Whether to enable debug logging
 * @param {React.ReactNode} props.children - The DataGrid or table component to wrap
 */
const TableDebugWrapper = ({ records = [], title = 'Table', debugEnabled = false, children }) => {
  const mountedRef = useRef(false);
  const prevRecordsLengthRef = useRef(0);

  useEffect(() => {
    // Only log in development mode when debugEnabled is true
    if (!debugEnabled || import.meta.env.PROD) {
      return;
    }

    const isFirstMount = !mountedRef.current;
    const recordsChanged = prevRecordsLengthRef.current !== records.length;

    if (isFirstMount) {
      console.log(`[TableMount] ${title}:`, {
        recordsCount: records.length,
        hasRecords: records.length > 0,
        timestamp: new Date().toISOString()
      });

      // Log first record sample
      if (records.length > 0) {
        const firstRecord = records[0];
        console.log(`[RowSample] ${title} - First Record:`, {
          keys: Object.keys(firstRecord),
          monetaryFields: {
            valor_total: firstRecord.valor_total,
            icms: firstRecord.icms,
            ipi: firstRecord.ipi,
            pis: firstRecord.pis,
            cofins: firstRecord.cofins,
            // Also check alternative field names
            total_de_mercadoria: firstRecord.total_de_mercadoria,
            valor_do_icms: firstRecord.valor_do_icms,
            valor_do_ipi: firstRecord.valor_do_ipi,
            valor_do_pis: firstRecord.valor_do_pis,
            valor_do_cofins: firstRecord.valor_do_cofins,
          },
          fullRecord: firstRecord
        });
      } else {
        console.warn(`[TableMount] ${title}: No records available (empty array)`);
      }

      mountedRef.current = true;
    } else if (recordsChanged) {
      console.log(`[TableUpdate] ${title}:`, {
        previousCount: prevRecordsLengthRef.current,
        newCount: records.length,
        timestamp: new Date().toISOString()
      });
    }

    prevRecordsLengthRef.current = records.length;
  }, [records, title, debugEnabled]);

  // Log if records become empty when they shouldn't be
  useEffect(() => {
    if (!debugEnabled || import.meta.env.PROD) {
      return;
    }

    if (mountedRef.current && records.length === 0 && prevRecordsLengthRef.current > 0) {
      console.error(`[Anomaly] ${title}: Records went from ${prevRecordsLengthRef.current} to 0!`, {
        timestamp: new Date().toISOString()
      });
    }
  }, [records.length, title, debugEnabled]);

  return (
    <Box data-debug-wrapper={title}>
      {children}
    </Box>
  );
};

export default TableDebugWrapper;
