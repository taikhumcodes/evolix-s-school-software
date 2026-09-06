import { describe, it, expect } from 'vitest';
import enLocale from '../i18n/locales/en/common.json';
import hiLocale from '../i18n/locales/hi/common.json';
import hinglishLocale from '../i18n/locales/hinglish/common.json';

function flattenKeys(obj: any, prefix = ''): Record<string, string> {
  let result: Record<string, string> = {};
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flattenKeys(obj[key], fullKey));
    } else {
      result[fullKey] = String(obj[key]);
    }
  }
  return result;
}

describe('I18N Completeness and Parity Test Suite', () => {
  const enFlat = flattenKeys(enLocale);
  const hiFlat = flattenKeys(hiLocale);
  const hinglishFlat = flattenKeys(hinglishLocale);

  const enKeys = Object.keys(enFlat).sort();
  const hiKeys = Object.keys(hiFlat).sort();
  const hinglishKeys = Object.keys(hinglishFlat).sort();

  it('has identical total key counts across English, Hindi, and Hinglish', () => {
    expect(hiKeys.length).toBe(enKeys.length);
    expect(hinglishKeys.length).toBe(enKeys.length);
  });

  it('has zero missing keys in Hindi compared to English', () => {
    const missingInHi = enKeys.filter((k) => !hiFlat.hasOwnProperty(k));
    expect(missingInHi).toEqual([]);
  });

  it('has zero missing keys in Hinglish compared to English', () => {
    const missingInHinglish = enKeys.filter((k) => !hinglishFlat.hasOwnProperty(k));
    expect(missingInHinglish).toEqual([]);
  });

  it('has no extraneous keys in Hindi or Hinglish not present in English', () => {
    const extraInHi = hiKeys.filter((k) => !enFlat.hasOwnProperty(k));
    const extraInHinglish = hinglishKeys.filter((k) => !enFlat.hasOwnProperty(k));
    expect(extraInHi).toEqual([]);
    expect(extraInHinglish).toEqual([]);
  });

  it('has no empty string values in any of the 3 locales', () => {
    const emptyEn = Object.entries(enFlat).filter(([_, v]) => v.trim() === '');
    const emptyHi = Object.entries(hiFlat).filter(([_, v]) => v.trim() === '');
    const emptyHinglish = Object.entries(hinglishFlat).filter(([_, v]) => v.trim() === '');

    expect(emptyEn).toEqual([]);
    expect(emptyHi).toEqual([]);
    expect(emptyHinglish).toEqual([]);
  });

  it('includes all critical Module 02 navigation keys across all locales', () => {
    const requiredNavKeys = [
      'navigation.configuration',
      'navigation.masterData',
      'navigation.students',
      'navigation.attendance',
      'navigation.finance',
      'navigation.academics',
      'navigation.exams',
      'navigation.users',
      'navigation.roles',
      'navigation.security',
      'navigation.academicYears',
      'navigation.setupWizard',
      'navigation.auditLogs',
      'navigation.schoolModules',
      'navigation.administration',
      'navigation.controlPlane',
      'navigation.isolated',
      'navigation.searchPlaceholder',
      'navigation.logout',
    ];

    for (const key of requiredNavKeys) {
      expect(enFlat).toHaveProperty(key);
      expect(hiFlat).toHaveProperty(key);
      expect(hinglishFlat).toHaveProperty(key);
    }
  });

  it('includes all masterData search, table, actions, and form keys across all locales', () => {
    const requiredMasterDataKeys = [
      'masterData.title',
      'masterData.subtitle',
      'masterData.description',
      'masterData.search.placeholder',
      'masterData.search.clear',
      'masterData.search.noResults',
      'masterData.actions.addNew',
      'masterData.actions.archive',
      'masterData.actions.restore',
      'masterData.actions.saveChanges',
      'masterData.actions.createRecord',
      'masterData.actions.cancel',
      'masterData.table.className',
      'masterData.table.sectionName',
      'masterData.table.subjectName',
      'masterData.table.capacity',
      'masterData.form.editTitle',
      'masterData.form.createTitle',
      'masterData.form.description',
    ];

    for (const key of requiredMasterDataKeys) {
      expect(enFlat).toHaveProperty(key);
      expect(hiFlat).toHaveProperty(key);
      expect(hinglishFlat).toHaveProperty(key);
    }
  });

  it('includes setup wizard board, role, and credential notice keys across all locales', () => {
    const requiredSetupKeys = [
      'setup.badge',
      'setup.title',
      'setup.description',
      'setup.educationalBoard',
      'setup.boards.cbse',
      'setup.boards.icse',
      'setup.boards.stateBoard',
      'setup.assignedRole',
      'setup.roles.principal',
      'setup.roles.teacher',
      'setup.addToList',
      'setup.copyPassword',
      'setup.importantNotice',
      'setup.tempPasswordNotice',
      'setup.staffCreatedSuccess',
    ];

    for (const key of requiredSetupKeys) {
      expect(enFlat).toHaveProperty(key);
      expect(hiFlat).toHaveProperty(key);
      expect(hinglishFlat).toHaveProperty(key);
    }
  });

  it('includes all Module 04 Parents and Family management keys across all locales', () => {
    const requiredParentsKeys = [
      'parentsModule.title',
      'parentsModule.subtitle',
      'parentsModule.tabs.overview',
      'parentsModule.tabs.guardians',
      'parentsModule.tabs.families',
      'parentsModule.actions.addGuardian',
      'parentsModule.actions.createFamily',
      'parentsModule.actions.mergeDuplicates',
      'parentsModule.actions.importCsv',
      'parentsModule.actions.exportCsv',
      'parentsModule.actions.provisionPortal',
      'parentsModule.merge.title',
      'parentsModule.merge.canonicalTitle',
      'parentsModule.merge.duplicateTitle',
      'parentsModule.merge.executeButton',
      'parentsModule.portal.title',
      'parentsModule.portal.tempPassword',
      'parentsModule.families.title',
      'parentsModule.families.familyName',
      'parentsModule.families.primaryGuardian',
      'parentsModule.import.title',
      'parentsModule.confidential.badge',
    ];

    for (const key of requiredParentsKeys) {
      expect(enFlat).toHaveProperty(key);
      expect(hiFlat).toHaveProperty(key);
      expect(hinglishFlat).toHaveProperty(key);
    }
  });
});

