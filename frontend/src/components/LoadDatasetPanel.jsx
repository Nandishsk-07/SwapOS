import React, { useState, useCallback } from 'react';
import { Upload, Database, RotateCcw, Download, Check, AlertCircle, FileSpreadsheet } from 'lucide-react';

export function LoadDatasetPanel({ uploadDataset, resetDataset, exportSnapshot, isSimulating }) {
  const [batteryFile, setBatteryFile] = useState(null);
  const [vehicleFile, setVehicleFile] = useState(null);
  const [batteryCols, setBatteryCols] = useState([]);
  const [vehicleCols, setVehicleCols] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [dragOverBattery, setDragOverBattery] = useState(false);
  const [dragOverVehicle, setDragOverVehicle] = useState(false);

  const parseColumns = (file, setCols) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const firstLine = text.split('\n')[0];
      if (firstLine) {
        const cols = firstLine.split(',').map(c => c.trim().replace(/"/g, ''));
        setCols(cols);
      }
    };
    reader.readAsText(file.slice(0, 1000)); // Read first 1KB only
  };

  const handleBatteryFile = (file) => {
    if (file && file.name.endsWith('.csv')) {
      setBatteryFile(file);
      parseColumns(file, setBatteryCols);
      setMsg({ type: '', text: '' });
    } else {
      setMsg({ type: 'error', text: 'Please upload a valid CSV file for batteries.' });
    }
  };

  const handleVehicleFile = (file) => {
    if (file && file.name.endsWith('.csv')) {
      setVehicleFile(file);
      parseColumns(file, setVehicleCols);
      setMsg({ type: '', text: '' });
    } else {
      setMsg({ type: 'error', text: 'Please upload a valid CSV file for vehicles.' });
    }
  };

  // Drag and Drop handlers
  const onDragOverBattery = useCallback((e) => {
    e.preventDefault();
    setDragOverBattery(true);
  }, []);

  const onDragLeaveBattery = useCallback(() => {
    setDragOverBattery(false);
  }, []);

  const onDropBattery = useCallback((e) => {
    e.preventDefault();
    setDragOverBattery(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleBatteryFile(e.dataTransfer.files[0]);
    }
  }, []);

  const onDragOverVehicle = useCallback((e) => {
    e.preventDefault();
    setDragOverVehicle(true);
  }, []);

  const onDragLeaveVehicle = useCallback(() => {
    setDragOverVehicle(false);
  }, []);

  const onDropVehicle = useCallback((e) => {
    e.preventDefault();
    setDragOverVehicle(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleVehicleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleRunAnalysis = async () => {
    if (!batteryFile && !vehicleFile) {
      setMsg({ type: 'error', text: 'Please stage at least one CSV file to analyze.' });
      return;
    }
    setIsLoading(true);
    setMsg({ type: '', text: '' });
    const success = await uploadDataset(batteryFile, vehicleFile);
    setIsLoading(false);
    if (success) {
      setMsg({ type: 'success', text: 'Datasets successfully updated! Dashboard reloaded.' });
      setBatteryFile(null);
      setVehicleFile(null);
      setBatteryCols([]);
      setVehicleCols([]);
    } else {
      setMsg({ type: 'error', text: 'Failed to process dataset files. Check console for errors.' });
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    setMsg({ type: '', text: '' });
    const success = await resetDataset();
    setIsLoading(false);
    if (success) {
      setMsg({ type: 'success', text: 'Restored original default datasets successfully.' });
      setBatteryFile(null);
      setVehicleFile(null);
      setBatteryCols([]);
      setVehicleCols([]);
    } else {
      setMsg({ type: 'error', text: 'Failed to restore defaults.' });
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 card-shadow font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-[#1A2130] flex items-center gap-2">
            <Database className="w-5 h-5 text-[#2F6FED]" />
            Dynamic Solution Console
          </h2>
          <p className="text-xs text-[#8A94A6]">Upload new fleet datasets or export active snapshot runs</p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportSnapshot}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-all flex items-center gap-1.5 border border-slate-200/50 shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export Snapshot
          </button>
          <button
            onClick={handleReset}
            disabled={isLoading || isSimulating}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all flex items-center gap-1.5 border border-slate-200/50 shadow-2xs"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            Reset to Default
          </button>
        </div>
      </div>

      {/* Two Dropzones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Battery Dropzone */}
        <div
          onDragOver={onDragOverBattery}
          onDragLeave={onDragLeaveBattery}
          onDrop={onDropBattery}
          className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all ${
            dragOverBattery 
              ? 'border-[#2F6FED] bg-blue-50/30' 
              : batteryFile 
                ? 'border-emerald-300 bg-emerald-50/10' 
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
          }`}
        >
          <input
            type="file"
            accept=".csv"
            id="battery-file-input"
            onChange={(e) => handleBatteryFile(e.target.files[0])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {batteryFile ? (
            <div className="space-y-1.5 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-800 font-mono truncate">{batteryFile.name}</p>
              <div className="text-[10px] text-slate-500">
                <span className="font-semibold block uppercase tracking-wider text-slate-400 text-[8px] mb-0.5">Columns Detected</span>
                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-100 text-slate-600 leading-relaxed block max-h-12 overflow-y-auto">
                  {batteryCols.join(', ') || 'No headers found'}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-[#2F6FED]/10 text-[#2F6FED] mx-auto flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Drag Battery Fleet CSV here</p>
                <p className="text-[10px] text-slate-400 mt-0.5">or click to browse local files</p>
              </div>
            </div>
          )}
        </div>

        {/* Vehicle Dropzone */}
        <div
          onDragOver={onDragOverVehicle}
          onDragLeave={onDragLeaveVehicle}
          onDrop={onDropVehicle}
          className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all ${
            dragOverVehicle 
              ? 'border-[#2F6FED] bg-blue-50/30' 
              : vehicleFile 
                ? 'border-emerald-300 bg-emerald-50/10' 
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
          }`}
        >
          <input
            type="file"
            accept=".csv"
            id="vehicle-file-input"
            onChange={(e) => handleVehicleFile(e.target.files[0])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {vehicleFile ? (
            <div className="space-y-1.5 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-800 font-mono truncate">{vehicleFile.name}</p>
              <div className="text-[10px] text-slate-500">
                <span className="font-semibold block uppercase tracking-wider text-slate-400 text-[8px] mb-0.5">Columns Detected</span>
                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-100 text-slate-600 leading-relaxed block max-h-12 overflow-y-auto">
                  {vehicleCols.join(', ') || 'No headers found'}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-[#2F6FED]/10 text-[#2F6FED] mx-auto flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Drag Vehicle Demands CSV here</p>
                <p className="text-[10px] text-slate-400 mt-0.5">or click to browse local files</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Message Feedback */}
      {msg.text && (
        <div className={`mt-4 p-3 rounded-xl flex items-start gap-2 text-xs border ${
          msg.type === 'error' 
            ? 'bg-red-50 text-red-800 border-red-200' 
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {msg.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" /> : <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
          <div>{msg.text}</div>
        </div>
      )}

      {/* Analyze Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleRunAnalysis}
          disabled={isLoading || isSimulating || (!batteryFile && !vehicleFile)}
          className="px-5 py-2 text-xs font-bold text-white bg-[#2F6FED] hover:bg-[#1E56C5] active:bg-[#15419A] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-4 h-4" />
          {isLoading ? 'Processing...' : 'Run Analysis'}
        </button>
      </div>

    </div>
  );
}
