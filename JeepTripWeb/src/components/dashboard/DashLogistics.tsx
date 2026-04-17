import { useState, memo } from 'react';
import type { LogisticsItem, LogisticsTemplate } from '../../lib/logistics';

interface DashLogisticsProps {
  tripId: string | undefined;
  logistics: LogisticsItem[];
  logCat: 'general' | 'rescue' | 'food';
  setLogCat: (cat: 'general' | 'rescue' | 'food') => void;
  loadLogistics: () => Promise<void>;
  canManage: boolean;
  isRTL: boolean;
  t: (key: any) => string;
  templates: LogisticsTemplate[];
  showTemplates: boolean;
  setShowTemplates: (show: boolean) => void;
  fetchLogisticsTemplates: () => Promise<LogisticsTemplate[]>;
  setTemplates: (templates: LogisticsTemplate[]) => void;
  handleDeleteItem: (itemId: string) => Promise<void>;
  updateLogisticsItem: (itemId: string, data: any) => Promise<void>;
  addLogisticsItem: (tripId: string, category: string, itemName: string) => Promise<void>;
  saveLogisticsTemplate: (name: string, items: LogisticsItem[]) => Promise<void>;
  applyLogisticsTemplate: (tripId: string, templateId: string) => Promise<void>;
}

export const DashLogistics = memo(({
  tripId,
  logistics,
  logCat,
  setLogCat,
  loadLogistics,
  canManage,
  isRTL,
  t,
  templates,
  showTemplates,
  setShowTemplates,
  fetchLogisticsTemplates,
  setTemplates,
  handleDeleteItem,
  updateLogisticsItem,
  addLogisticsItem,
  saveLogisticsTemplate,
  applyLogisticsTemplate
}: DashLogisticsProps) => {
  const [newItem, setNewItem] = useState('');
  const [editingItem, setEditingItem] = useState<LogisticsItem | null>(null);

  const handleAddItemLocal = async () => {
    if (!newItem.trim() || !tripId) return;
    if (editingItem) {
      await updateLogisticsItem(editingItem.id, { item_name: newItem.trim() });
      setEditingItem(null);
    } else {
      await addLogisticsItem(tripId, logCat, newItem.trim());
    }
    setNewItem('');
    loadLogistics();
  };

  const filteredLogistics = logistics.filter(l => l.category === logCat);
  const rtl = isRTL ? 'rtl' : '';
  const row = isRTL ? 'row-reverse' : 'row';

  return (
    <div className="logistics-screen">
      <div className="log-cat-tabs" style={{ flexDirection: row as any }}>
        {(['general', 'rescue', 'food'] as const).map(cat => (
          <button key={cat} className={`log-cat-tab ${logCat === cat ? 'active' : ''}`} onClick={() => setLogCat(cat)}>
            {cat === 'general' ? (isRTL ? 'ברכב' : 'In Car') : cat === 'rescue' ? (isRTL ? 'חילוץ' : 'Rescue') : (isRTL ? 'אוכל/שתיה' : 'Food')}
          </button>
        ))}
      </div>

      {canManage && (
        <div style={{ padding: '8px var(--sp-md) 0' }}>
          <button className="btn btn-outline" style={{ fontSize: 13, padding: '8px 12px', width: 'auto' }} onClick={() => { setShowTemplates(true); fetchLogisticsTemplates().then(setTemplates); }}>
            📄 {isRTL ? 'תבניות לוגיסטיקה' : 'Logistics Templates'}
          </button>
        </div>
      )}

      <div className="log-list">
        {filteredLogistics.length === 0 ? (
          <p style={{ color: 'var(--mud)', fontSize: 14, textAlign: 'center', padding: 20 }}>{isRTL ? 'אין פריטים עדיין' : 'No items yet'}</p>
        ) : filteredLogistics.map(item => (
          <div key={item.id} className={`log-item ${rtl}`}>
            <span className="log-item-name">{item.item_name}</span>
            <div className="log-item-actions">
              <button onClick={() => { setEditingItem(item); setNewItem(item.item_name); }} className="log-action-btn">✏️</button>
              <button onClick={() => handleDeleteItem(item.id)} className="log-action-btn danger">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      <div className={`log-input-row ${rtl}`}>
        <input
          className={`input ${rtl}`}
          style={{ flex: 1 }}
          placeholder={editingItem ? (isRTL ? 'ערוך שם פריט...' : 'Edit item name...') : (isRTL ? 'הוסף פריט...' : 'Add item...')}
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddItemLocal()}
        />
        <button className="send-btn" onClick={handleAddItemLocal}>{editingItem ? '✓' : '+'}</button>
        {editingItem && <button className="log-action-btn" onClick={() => { setEditingItem(null); setNewItem(''); }}>✕</button>}
      </div>

      {/* Templates panel */}
      {showTemplates && (
        <div className="modal-overlay" onClick={() => setShowTemplates(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <p className="modal-title">{isRTL ? 'תבניות לוגיסטיקה' : 'Logistics Templates'}</p>
            <button className="btn btn-olive" style={{ marginBottom: 'var(--sp-md)' }} onClick={async () => {
              const name = window.prompt(isRTL ? 'שם התבנית' : 'Template name');
              if (!name) return;
              await saveLogisticsTemplate(name, logistics);
              const updated = await fetchLogisticsTemplates();
              setTemplates(updated);
            }}>💾 {isRTL ? 'שמור רשימה נוכחית' : 'Save current list'}</button>
            {templates.length === 0 ? <p style={{ color: 'var(--sand)', fontSize: 14 }}>{isRTL ? 'אין תבניות שמורות' : 'No saved templates'}</p>
              : templates.map(tmpl => (
                <div key={tmpl.id} className="card" style={{ padding: 'var(--sp-md)', marginBottom: 10, cursor: 'pointer' }}
                  onClick={async () => { if (!tripId) return; await applyLogisticsTemplate(tripId, tmpl.id); setShowTemplates(false); loadLogistics(); }}>
                  <p style={{ color: 'var(--cream)', fontWeight: 700 }}>{tmpl.name}</p>
                  <p style={{ color: 'var(--gold)', fontSize: 11, marginTop: 4 }}>{isRTL ? 'לחץ לטעינה' : 'Tap to load'}</p>
                </div>
              ))}
            <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => setShowTemplates(false)}>{t('btn_cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
});
