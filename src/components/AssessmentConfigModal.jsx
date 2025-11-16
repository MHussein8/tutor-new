// components/AssessmentConfigModal.jsx

import React, { useState, useEffect, useCallback } from 'react';
import '../styles/assessment-config-modal.css';
import {
  getAssessmentFields,
  createAssessmentField,
  updateAssessmentField,
  deleteAssessmentField
} from '../services/teacherService';
import {
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiCloseLine,
  RiDragMove2Line,
  RiSaveLine,
  RiEyeLine,
  RiEyeOffLine
} from 'react-icons/ri';

// أنواع الحقول المتاحة
const FIELD_TYPES = [
  { value: 'number', label: 'درجة رقمية' },
  { value: 'text', label: 'ملاحظة نصية' },
  { value: 'select', label: 'اختيار من قائمة' },
  { value: 'boolean', label: 'نعم/لا' },
];

const AssessmentConfigModal = ({ isOpen, onClose, onConfigChange }) => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // إضافة عنصر جديد
  const [newField, setNewField] = useState({
    field_name: '',
    field_type: 'number',
    max_score: 10,
    select_options: '',
  });

  // تعديل عنصر موجود
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [editingData, setEditingData] = useState({});

  // -------------------
  // 1. جلب البيانات
  // -------------------
  const fetchFields = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAssessmentFields();
      const sortedData = data.sort((a, b) => a.order_index - b.order_index);
      setFields(sortedData);
    } catch (err) {
      console.error("Failed to fetch assessment fields:", err);
      setError("⚠️ فشل في تحميل عناصر التقييم.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFields();
      setSuccess(null);
    }
  }, [isOpen, fetchFields]);

  // -------------------
  // 2. إضافة عنصر جديد
  // -------------------
  const handleNewFieldChange = (e) => {
    const { name, value } = e.target;
    setNewField(prev => ({
      ...prev,
      [name]: name === 'max_score' ? parseInt(value) || 0 : value
    }));
  };

  const handleCreateField = async () => {
    if (!newField.field_name.trim()) {
      setError("⚠️ يرجى إدخال اسم العنصر");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dataToSend = { 
        ...newField,
        order_index: Math.max(...fields.map(f => f.order_index), 0) + 1
      };

      // معالجة الخيارات للقوائم المنسدلة
      if (dataToSend.field_type === 'select') {
        dataToSend.select_options = dataToSend.select_options
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        if (dataToSend.select_options.length === 0) {
          setError("⚠️ يرجى إدخال خيارات صحيحة");
          return;
        }
      } else {
        delete dataToSend.select_options;
      }

      // إزالة max_score إذا مش رقمي
      if (dataToSend.field_type !== 'number') {
        delete dataToSend.max_score;
      }

      await createAssessmentField(dataToSend);

      setNewField({ 
        field_name: '', 
        field_type: 'number', 
        max_score: 10, 
        select_options: '' 
      });
      
      await fetchFields();
      setSuccess("✅ تم إضافة العنصر بنجاح");
      if (onConfigChange) onConfigChange();
    } catch (err) {
      console.error("Failed to create assessment field:", err);
      setError("⚠️ فشل في إضافة العنصر. تأكد من صحة البيانات.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------
  // 3. تعديل العناصر
  // -------------------
  const startEditing = (field) => {
    setEditingFieldId(field.id);
    setEditingData({
      field_name: field.field_name,
      field_type: field.field_type,
      max_score: field.max_score || 10,
      select_options: field.select_options ? field.select_options.join(', ') : ''
    });
    setError(null);
    setSuccess(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingData(prev => ({
      ...prev,
      [name]: name === 'max_score' ? parseInt(value) || 0 : value
    }));
  };

  const handleSaveEdit = async (fieldId) => {
    if (!editingData.field_name.trim()) {
      setError("⚠️ يرجى إدخال اسم العنصر");
      return;
    }

    setLoading(true);
    try {
      const dataToSend = { ...editingData };

      // معالجة الخيارات للقوائم المنسدلة
      if (dataToSend.field_type === 'select') {
        dataToSend.select_options = dataToSend.select_options
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        if (dataToSend.select_options.length === 0) {
          setError("⚠️ يرجى إدخال خيارات صحيحة");
          return;
        }
      } else {
        delete dataToSend.select_options;
      }

      // إزالة max_score إذا مش رقمي
      if (dataToSend.field_type !== 'number') {
        delete dataToSend.max_score;
      }

      await updateAssessmentField(fieldId, dataToSend);
      setEditingFieldId(null);
      await fetchFields();
      setSuccess("✅ تم تعديل العنصر بنجاح");
      if (onConfigChange) onConfigChange();
    } catch (err) {
      setError("⚠️ فشل في تعديل العنصر.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (field) => {
    setLoading(true);
    try {
      await updateAssessmentField(field.id, { is_active: !field.is_active });
      await fetchFields();
      setSuccess(`✅ تم ${!field.is_active ? 'تفعيل' : 'إلغاء تفعيل'} العنصر`);
      if (onConfigChange) onConfigChange();
    } catch (err) {
      setError("⚠️ فشل في تحديث حالة العنصر.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fieldId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا العنصر؟\nملاحظة: لن يتم حذف التقييمات القديمة المرتبطة بهذا العنصر.")) return;
    
    setLoading(true);
    try {
      await deleteAssessmentField(fieldId);
      await fetchFields();
      setSuccess("✅ تم حذف العنصر بنجاح");
      if (onConfigChange) onConfigChange();
    } catch (err) {
      setError("⚠️ فشل في حذف العنصر.");
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingFieldId(null);
    setEditingData({});
    setError(null);
  };

  // -------------------
  // 4. الواجهة
  // -------------------
  if (!isOpen) return null;

  return (
    <div className="assessment-config-modal-overlay">
      <div className="assessment-config-modal-content">
        {/* رأس النافذة */}
        <div className="modal-header">
          <div className="header-title">
            <h2>🛠️ إعداد عناصر التقييم</h2>
            <p>قم بإدارة العناصر التي تستخدمها في تقييم طلابك</p>
          </div>
          <button onClick={onClose} className="close-button">
            <RiCloseLine />
          </button>
        </div>

        {/* رسائل التنبيه */}
        <div className="alerts-container">
          {loading && (
            <div className="alert alert-loading">
              ⏳ جاري التحميل...
            </div>
          )}
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              {success}
            </div>
          )}
        </div>

        {/* العناصر الحالية */}
        <div className="fields-section">
          <div className="section-header">
            <h3>📋 العناصر الحالية</h3>
            <span className="counter">
              ({fields.filter(f => f.is_active).length} نشط من أصل {fields.length})
            </span>
          </div>
          
          <div className="fields-list">
            {fields.length === 0 ? (
              <div className="empty-state">
                <p>لا توجد عناصر تقييم حالياً</p>
                <small>ابدأ بإضافة عناصر تقييم جديدة</small>
              </div>
            ) : (
              fields.map((field) => (
                <div key={field.id} className={`field-item ${!field.is_active ? 'inactive' : ''}`}>
                  <RiDragMove2Line className="drag-handle" title="اسحب للترتيب" />

                  {editingFieldId === field.id ? (
                    <div className="editing-form">
                      <div className="form-row">
                        <input
                          type="text"
                          name="field_name"
                          value={editingData.field_name}
                          onChange={handleEditChange}
                          placeholder="اسم العنصر"
                          className="field-name-input"
                        />
                        
                        <select
                          name="field_type"
                          value={editingData.field_type}
                          onChange={handleEditChange}
                          className="field-type-select"
                        >
                          {FIELD_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-row">
                        {editingData.field_type === 'number' && (
                          <div className="max-score-input">
                            <label>أقصى درجة:</label>
                            <input
                              type="number"
                              name="max_score"
                              value={editingData.max_score}
                              onChange={handleEditChange}
                              min="1"
                              max="100"
                            />
                          </div>
                        )}

                        {editingData.field_type === 'select' && (
                          <div className="select-options-input">
                            <label>خيارات القائمة:</label>
                            <textarea
                              name="select_options"
                              value={editingData.select_options}
                              onChange={handleEditChange}
                              placeholder="اكتب الخيارات مفصولة بفاصلة (مثال: ممتاز, جيد جداً, مقبول)"
                              rows="2"
                            />
                          </div>
                        )}
                      </div>

                      <div className="edit-actions">
                        <button 
                          onClick={() => handleSaveEdit(field.id)} 
                          className="btn btn-success"
                        >
                          <RiSaveLine /> حفظ التعديلات
                        </button>
                        <button 
                          onClick={cancelEdit}
                          className="btn btn-cancel"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="field-info">
                        <span className="field-name">
                          {field.field_name}
                          <small className="field-type">
                            ({FIELD_TYPES.find(t => t.value === field.field_type)?.label})
                          </small>
                          {field.field_type === 'number' && (
                            <small className="max-score">أقصى: {field.max_score}</small>
                          )}
                        </span>
                        {!field.is_active && (
                          <span className="inactive-badge">غير نشط</span>
                        )}
                      </div>

                      <div className="field-actions">
                        <button 
                          onClick={() => handleToggleActive(field)}
                          className={`btn btn-toggle ${field.is_active ? 'active' : 'inactive'}`}
                          title={field.is_active ? 'إلغاء التفعيل' : 'تفعيل'}
                        >
                          {field.is_active ? <RiEyeLine /> : <RiEyeOffLine />}
                        </button>
                        <button 
                          onClick={() => startEditing(field)}
                          className="btn btn-edit"
                          title="تعديل"
                        >
                          <RiEditLine />
                        </button>
                        <button 
                          onClick={() => handleDelete(field.id)}
                          className="btn btn-delete"
                          title="حذف"
                        >
                          <RiDeleteBinLine />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* إضافة عنصر جديد */}
        <div className="add-field-section">
          <div className="section-header">
            <h3><RiAddLine /> إضافة عنصر جديد</h3>
          </div>
          
          <div className="add-form">
            <div className="form-row">
              <input
                type="text"
                name="field_name"
                value={newField.field_name}
                onChange={handleNewFieldChange}
                placeholder="اسم العنصر (مثال: التعبير الشفوي، الإملاء، المناقشة)"
                className="field-name-input"
              />
              
              <select
                name="field_type"
                value={newField.field_type}
                onChange={handleNewFieldChange}
                className="field-type-select"
              >
                {FIELD_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              {newField.field_type === 'number' && (
                <div className="max-score-input">
                  <label>أقصى درجة:</label>
                  <input
                    type="number"
                    name="max_score"
                    value={newField.max_score}
                    onChange={handleNewFieldChange}
                    placeholder="أقصى درجة"
                    min="1"
                    max="100"
                  />
                </div>
              )}

              {newField.field_type === 'select' && (
                <div className="select-options-input">
                  <label>خيارات القائمة:</label>
                  <textarea
                    name="select_options"
                    value={newField.select_options}
                    onChange={handleNewFieldChange}
                    placeholder="اكتب الخيارات مفصولة بفاصلة (مثال: ممتاز, جيد جداً, مقبول)"
                    rows="2"
                  />
                </div>
              )}
            </div>

            <button 
              onClick={handleCreateField} 
              disabled={loading || !newField.field_name.trim()}
              className="btn btn-primary add-button"
            >
              {loading ? '⏳ جاري الإضافة...' : '➕ إضافة عنصر جديد'}
            </button>
          </div>
        </div>

        {/* تذييل النافذة */}
        <div className="modal-footer">
          <p className="help-text">
            💡 نصيحة: يمكنك إضافة عناصر تقييم تناسب مادتك الدراسية مثل (القواعد، المفردات، التعبير، الإملاء، إلخ)
          </p>
          <button onClick={onClose} className="btn btn-secondary">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentConfigModal;