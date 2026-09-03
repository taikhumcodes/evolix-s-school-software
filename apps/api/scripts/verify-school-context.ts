import { prisma } from '../src/lib/prisma.js';

async function main() {
  console.log('--- 1. DATABASE INSPECTION ---');
  const tenant = await prisma.tenant.findFirst();
  console.log('Tenant in DB:', tenant ? { id: tenant.id, name: tenant.name } : 'None');

  const schools = await prisma.school.findMany();
  console.log('Schools in DB:', schools.map(s => ({ id: s.id, tenantId: s.tenantId, name: s.name, code: s.code })));

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@evolix.local' },
    include: {
      userSchools: {
        include: { school: true }
      }
    }
  });
  console.log('Admin User in DB:', adminUser ? {
    id: adminUser.id,
    email: adminUser.email,
    tenantId: adminUser.tenantId,
    userSchools: adminUser.userSchools.map(us => ({ schoolId: us.schoolId, schoolName: us.school.name }))
  } : 'NOT FOUND');

  console.log('\n--- 2. HTTP AUTH / ME TRACE ---');
  const loginRes = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@evolix.local', password: 'Password123!' })
  });
  const loginData = await loginRes.json();
  console.log('Login Response token_type:', loginData.token_type);

  if (loginData.access_token) {
    const meRes = await fetch('http://127.0.0.1:8000/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${loginData.access_token}` }
    });
    const meData = await meRes.json();
    console.log('GET /auth/me Response:', JSON.stringify(meData, null, 2));

    const schoolId = meData.schools?.[0]?.id || meData.school_id;
    console.log('\nDerived schoolId from /auth/me:', schoolId);

    // 1. Test academic years create & list & exclusivity
    const ayName = `AY-${Date.now()}`;
    const createAyRes = await fetch('http://127.0.0.1:8000/api/v1/academic-years', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginData.access_token}`,
        'X-School-Id': schoolId,
      },
      body: JSON.stringify({
        school_id: schoolId,
        name: ayName,
        start_date: '2026-04-01',
        end_date: '2027-03-31',
        is_current: true,
      }),
    });
    const createAyData = await createAyRes.json();
    console.log(`1. POST /academic-years status: ${createAyRes.status}`, createAyData);

    const ayRes = await fetch(`http://127.0.0.1:8000/api/v1/academic-years?school_id=${schoolId}`, {
      headers: { Authorization: `Bearer ${loginData.access_token}` }
    });
    const ayListData = await ayRes.json();
    console.log(`1. GET /academic-years status: ${ayRes.status} count: ${ayListData.length}`);

    // 2. Test school configuration GET & PATCH
    const getSchoolCfg = await fetch(`http://127.0.0.1:8000/api/v1/configuration/school?school_id=${schoolId}`, {
      headers: { Authorization: `Bearer ${loginData.access_token}` }
    });
    const schoolCfgData = await getSchoolCfg.json();
    console.log(`2. GET /configuration/school status: ${getSchoolCfg.status} version: ${schoolCfgData.version}`);

    const patchSchoolCfg = await fetch(`http://127.0.0.1:8000/api/v1/configuration/school?school_id=${schoolId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginData.access_token}`,
      },
      body: JSON.stringify({
        version: schoolCfgData.version,
        values: {
          phone: '+91 9876543210',
          website: 'https://greenwood.example.com',
        },
      }),
    });
    const patchSchoolData = await patchSchoolCfg.json();
    console.log(`2. PATCH /configuration/school status: ${patchSchoolCfg.status} new_version: ${patchSchoolData.version}`, patchSchoolData.values);

    // 3. Test attendance configuration GET & PATCH
    const getAttCfg = await fetch(`http://127.0.0.1:8000/api/v1/configuration/attendance?school_id=${schoolId}`, {
      headers: { Authorization: `Bearer ${loginData.access_token}` }
    });
    const attCfgData = await getAttCfg.json();
    console.log(`3. GET /configuration/attendance status: ${getAttCfg.status} version: ${attCfgData.version}`);

    const patchAttCfg = await fetch(`http://127.0.0.1:8000/api/v1/configuration/attendance?school_id=${schoolId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginData.access_token}`,
      },
      body: JSON.stringify({
        version: attCfgData.version,
        values: {
          attendance_lock_enabled: true,
          attendance_lock_hours: 48,
          attendance_correction_allowed: true,
          teacher_geofence_radius_meters: 200,
        },
      }),
    });
    const patchAttData = await patchAttCfg.json();
    console.log(`3. PATCH /configuration/attendance status: ${patchAttCfg.status} new_version: ${patchAttData.version}`, patchAttData.values);

    // 4. Test number series list & preview
    const cfgNsRes = await fetch(`http://127.0.0.1:8000/api/v1/configuration/number-series?school_id=${schoolId}`, {
      headers: { Authorization: `Bearer ${loginData.access_token}` }
    });
    const nsList = await cfgNsRes.json();
    console.log(`4. GET /configuration/number-series status: ${cfgNsRes.status} count: ${nsList.length}`);
    const firstSeries = nsList[0];
    if (firstSeries) {
      const prevVal = firstSeries.current_value;
      const previewRes = await fetch(`http://127.0.0.1:8000/api/v1/configuration/number-series/${firstSeries.id}/preview?school_id=${schoolId}&prefix=${encodeURIComponent(firstSeries.prefix || '')}&padding=${firstSeries.padding}`, {
        headers: { Authorization: `Bearer ${loginData.access_token}` }
      });
      const previewData = await previewRes.json();
      console.log(`4. Preview for ${firstSeries.code}:`, previewData, `Initial current_value: ${prevVal}`);

      // Re-fetch to ensure preview did NOT increment
      const checkNsRes = await fetch(`http://127.0.0.1:8000/api/v1/configuration/number-series?school_id=${schoolId}`, {
        headers: { Authorization: `Bearer ${loginData.access_token}` }
      });
      const checkNsList = await checkNsRes.json();
      const afterSeries = checkNsList.find((s: any) => s.id === firstSeries.id);
      console.log(`4. Re-check current_value after preview: ${afterSeries.current_value} (Should be unchanged: ${prevVal === afterSeries.current_value})`);
    }

    // 5. Test branding upload with valid image
    const formData = new FormData();
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
    formData.append('file', new Blob([pngBytes], { type: 'image/png' }), 'test-logo.png');

    const brandUploadRes = await fetch(`http://127.0.0.1:8000/api/v1/configuration/branding/upload?school_id=${schoolId}&asset_type=logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginData.access_token}` },
      body: formData,
    });
    const brandData = await brandUploadRes.json();
    console.log(`5. POST /configuration/branding/upload status: ${brandUploadRes.status}`, brandData.values?.logo_file_id ? 'LOGO_SAVED' : brandData);

    // 6. Test invalid branding files rejection
    // 6a: Text file with text/plain
    const txtForm = new FormData();
    txtForm.append('file', new Blob(['HELLO THIS IS TEXT NOT PNG'], { type: 'text/plain' }), 'fake.txt');
    const txtRes = await fetch(`http://127.0.0.1:8000/api/v1/configuration/branding/upload?school_id=${schoolId}&asset_type=logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginData.access_token}` },
      body: txtForm,
    });
    console.log(`6a. Text file rejection status: ${txtRes.status}`, await txtRes.json());

    // 6b: Spoofed file (text content named fake.png with image/png MIME)
    const spoofedForm = new FormData();
    spoofedForm.append('file', new Blob(['MALICIOUS_EXECUTABLE_CONTENT'], { type: 'image/png' }), 'fake.png');
    const spoofedRes = await fetch(`http://127.0.0.1:8000/api/v1/configuration/branding/upload?school_id=${schoolId}&asset_type=logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginData.access_token}` },
      body: spoofedForm,
    });
    console.log(`6b. Spoofed PNG rejection status: ${spoofedRes.status}`, await spoofedRes.json());

    // 6c: Executable file (.exe)
    const exeForm = new FormData();
    exeForm.append('file', new Blob(['MZ\x90\x00\x03\x00\x00\x00'], { type: 'application/x-msdownload' }), 'malware.exe');
    const exeRes = await fetch(`http://127.0.0.1:8000/api/v1/configuration/branding/upload?school_id=${schoolId}&asset_type=logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginData.access_token}` },
      body: exeForm,
    });
    console.log(`6c. Executable rejection status: ${exeRes.status}`, await exeRes.json());

    // 7. Test Branding Save (exact UI flow: GET branding -> user clicks save)
    const brandGet = await fetch(`http://127.0.0.1:8000/api/v1/configuration/branding?school_id=${schoolId}`, {
      headers: { Authorization: `Bearer ${loginData.access_token}` }
    });
    const currentBranding = await brandGet.json();
    console.log(`7. GET /configuration/branding version: ${currentBranding.version}`, currentBranding.values);

    const brandPatchRes = await fetch(`http://127.0.0.1:8000/api/v1/configuration/branding?school_id=${schoolId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginData.access_token}`,
      },
      body: JSON.stringify({
        version: currentBranding.version,
        values: currentBranding.values,
      }),
    });
    console.log(`7. PATCH /configuration/branding status: ${brandPatchRes.status}`, await brandPatchRes.json());
  }
}

main().catch(console.error).finally(() => process.exit(0));
