// src/components/EditCourseModal.jsx
import React, { useState, useEffect } from 'react';
import { courseService } from '../services/courseService'; // للاستدعاء الدالة
// نفترض أنك تستخدم نفس تنسيقات مودال إنشاء الكورس
import '../styles/CreateCourseModal.css'; 

const EditCourseModal = ({ isOpen, onClose, course, onSuccess }) => {
    // 💡 course هو الكائن الذي يحتوي على بيانات الكورس المراد تعديله
    // 💡 onSuccess هي الدالة التي يتم استدعاؤها لإعادة تحميل القائمة
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [gradeLevelId, setGradeLevelId] = useState('');
    const [groupTypeId, setGroupTypeId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [gradeLevels, setGradeLevels] = useState([]); // لخيارات المراحل
    const [groupTypes, setGroupTypes] = useState([]); // لخيارات الأنواع

    // 1. جلب خيارات القوائم المنسدلة (المراحل والأنواع)
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                // نفترض أن لديك دالة في courseService لجلب كل الخيارات المتاحة
                const { allGradeLevels, allGroupTypes } = await courseService.getCourseOptions(); 
                setGradeLevels(allGradeLevels);
                setGroupTypes(allGroupTypes);
            } catch (err) {
                console.error('Failed to fetch course options:', err);
            }
        };
        fetchOptions();
    }, []);

    // 2. تعبئة الحقول ببيانات الكورس عند فتح المودال
    useEffect(() => {
        if (isOpen && course) {
            setName(course.name || '');
            setDescription(course.description || '');
            // تعبئة الـ ID المناسب، مع الأخذ في الاعتبار أن الكورس يحتوي على كائن nested
            setGradeLevelId(course.grade_levels?.id || course.grade_level_id || '');
            setGroupTypeId(course.group_types?.id || course.group_type_id || '');
            setError(null);
        }
    }, [isOpen, course]);

    // إذا لم يكن المودال مفتوحاً، لا تقم بعرض أي شيء
    if (!isOpen || !course) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // البيانات المراد تحديثها
        const updates = {
            name,
            description,
            grade_level_id: gradeLevelId,
            group_type_id: groupTypeId,
            // ⚠️ ملاحظة: نحن لا نغير teacher_id أو color_groups هنا
        };

        try {
            await courseService.updateCourse(course.id, updates);
            
            // استدعاء دالة onSuccess لإعادة جلب قائمة الكورسات المحدثة
            onSuccess();
            // إغلاق المودال
            onClose();

        } catch (err) {
            console.error('Error updating course:', err);
            setError('❌ فشل تعديل الكورس: ' + (err.message || 'حدث خطأ غير معروف'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>تعديل الكورس: {course.name}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    
                    {error && <p className="error-message" style={{color: 'red'}}>{error}</p>}
                    
                    <div className="form-group">
                        <label htmlFor="name">اسم الكورس</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">الوصف</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    
                    {/* القائمة المنسدلة للمرحلة الدراسية */}
                    <div className="form-group">
                        <label htmlFor="gradeLevel">المرحلة الدراسية</label>
                        <select
                            id="gradeLevel"
                            value={gradeLevelId}
                            onChange={(e) => setGradeLevelId(e.target.value)}
                            required
                        >
                            <option value="">-- اختر المرحلة --</option>
                            {gradeLevels.map(level => (
                                <option key={level.id} value={level.id}>{level.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* القائمة المنسدلة لنوع المجموعة */}
                    <div className="form-group">
                        <label htmlFor="groupType">نوع المجموعة</label>
                        <select
                            id="groupType"
                            value={groupTypeId}
                            onChange={(e) => setGroupTypeId(e.target.value)}
                            required
                        >
                            <option value="">-- اختر النوع --</option>
                            {groupTypes.map(type => (
                                <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                            إلغاء
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'جاري التعديل...' : 'حفظ التعديلات'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCourseModal;