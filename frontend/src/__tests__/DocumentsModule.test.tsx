import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentsLayout } from '../app/views/documents/DocumentsLayout';
import { DocumentsOverview } from '../app/views/documents/DocumentsOverview';
import { TemplatesView } from '../app/views/documents/TemplatesView';
import { TemplateEditorView } from '../app/views/documents/TemplateEditorView';
import { GenerateDocumentView } from '../app/views/documents/GenerateDocumentView';
import { GeneratedDocumentsView } from '../app/views/documents/GeneratedDocumentsView';
import { BulkGenerationView } from '../app/views/documents/BulkGenerationView';
import { SignaturesBrandingView } from '../app/views/documents/SignaturesBrandingView';
import { DocumentReportsView } from '../app/views/documents/DocumentReportsView';
import { PublicDocumentVerification } from '../app/views/documents/PublicDocumentVerification';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string) => defaultVal || key,
  }),
}));

// Mock api-client
vi.mock('../lib/api-client', () => ({
  default: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url.includes('/documents/reports/stats')) {
        return Promise.resolve({
          data: {
            totalDocuments: 15,
            finalizedDocuments: 12,
            cancelledDocuments: 1,
            draftDocuments: 2,
            reprintCountTotal: 5,
            byCategory: { STUDENT: 10, FINANCE: 3, ACADEMIC: 2 },
            byType: { BONAFIDE_CERTIFICATE: 8, FEE_RECEIPT: 3, REPORT_CARD: 2 },
            recentIssuances: [
              {
                id: 'doc-1',
                documentNumber: 'BON-2026-00001',
                documentType: 'BONAFIDE_CERTIFICATE',
                category: 'STUDENT',
                status: 'FINALIZED',
                reprintCount: 2,
                createdAt: '2026-09-07T00:00:00Z',
                dataSnapshotJson: { student: { fullName: 'Aarav Sharma' } },
              },
            ],
          },
        });
      }
      if (url.match(/\/documents\/templates\/[a-zA-Z0-9_-]+$/)) {
        return Promise.resolve({
          data: {
            id: 'tpl-1',
            code: 'BONAFIDE_CERTIFICATE_STD',
            name: 'Standard Bonafide Certificate',
            documentType: 'BONAFIDE_CERTIFICATE',
            category: 'STUDENT',
            pageSize: 'A4',
            orientation: 'PORTRAIT',
            status: 'PUBLISHED',
            currentVersionId: 'ver-1',
            versions: [
              {
                id: 'ver-1',
                versionNumber: 1,
                layoutDefinition: { margins: { top: 40, bottom: 40, left: 40, right: 40 }, elements: [] },
                isPublished: true,
              },
            ],
          },
        });
      }
      if (url.includes('/documents/templates')) {
        return Promise.resolve({
          data: [
            {
              id: 'tpl-1',
              code: 'BONAFIDE_CERTIFICATE_STD',
              name: 'Standard Bonafide Certificate',
              documentType: 'BONAFIDE_CERTIFICATE',
              category: 'STUDENT',
              pageSize: 'A4',
              orientation: 'PORTRAIT',
              status: 'PUBLISHED',
              numberingPolicy: 'NUMBER_SERIES_ON_FINALIZE',
              versions: [
                {
                  id: 'ver-1',
                  versionNumber: 1,
                  layoutDefinition: { margins: { top: 40, bottom: 40, left: 40, right: 40 }, elements: [] },
                  isPublished: true,
                },
              ],
            },
          ],
        });
      }
      if (url.includes('/documents/signatures')) {
        return Promise.resolve({
          data: [
            {
              id: 'sig-1',
              name: 'Principal Signature',
              assetType: 'SIGNATURE',
              signatoryName: 'Dr. Sharma',
              designation: 'Principal',
              storageKey: 'uploads/sig1.png',
              mimeType: 'image/png',
              fileSizeBytes: 10240,
              isActive: true,
            },
          ],
        });
      }
      if (url.includes('/documents/bulk-jobs')) {
        return Promise.resolve({
          data: [
            {
              id: 'job-1',
              templateId: 'tpl-1',
              sourceType: 'STUDENT',
              status: 'COMPLETED',
              totalCount: 5,
              successCount: 5,
              failureCount: 0,
              createdAt: '2026-09-07T00:00:00Z',
            },
          ],
        });
      }
      if (url.includes('/students')) {
        return Promise.resolve({
          data: {
            items: [
              {
                id: 'stu-1',
                firstName: 'Aarav',
                lastName: 'Sharma',
                admissionNumber: 'ADM-001',
                currentClass: { name: 'Class 10' },
              },
            ],
            total: 1,
          },
        });
      }
      if (url.includes('/documents')) {
        return Promise.resolve({
          data: {
            items: [
              {
                id: 'doc-1',
                documentNumber: 'BON-2026-00001',
                documentType: 'BONAFIDE_CERTIFICATE',
                category: 'STUDENT',
                status: 'FINALIZED',
                reprintCount: 2,
                checksumSha256: 'abcdef1234567890abcdef',
                createdAt: '2026-09-07T00:00:00Z',
                dataSnapshotJson: { student: { fullName: 'Aarav Sharma' } },
              },
            ],
            total: 1,
            page: 1,
            limit: 15,
          },
        });
      }
      return Promise.resolve({ data: {} });
    }),
    post: vi.fn().mockResolvedValue({ data: { id: 'doc-new', status: 'FINALIZED' } }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

// Mock axios for public verification
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/public/documents/verify/valid-token')) {
        return Promise.resolve({
          data: {
            isValid: true,
            status: 'FINALIZED',
            documentNumber: 'BON-2026-00001',
            documentType: 'BONAFIDE_CERTIFICATE',
            issueDate: '07 September 2026',
            schoolName: 'Greenwood High School',
            checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          },
        });
      }
      return Promise.resolve({
        data: {
          isValid: false,
          status: 'CANCELLED',
          reason: 'DOCUMENT_REVOKED',
          cancelledAt: '2026-09-07T12:00:00Z',
        },
      });
    }),
  },
}));

describe('EVOLIX School ERP — Module 11 Documents & Printing Frontend Test Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('1. DocumentsLayout renders title, M11 badge, and all navigation tabs', () => {
    renderWithProviders(<DocumentsLayout />);
    expect(screen.getByText('Documents, Certificates & Printing')).toBeInTheDocument();
    expect(screen.getByText('M11')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.getByText('Generate')).toBeInTheDocument();
    expect(screen.getByText('Document Register')).toBeInTheDocument();
    expect(screen.getByText('Bulk Generation')).toBeInTheDocument();
    expect(screen.getByText('Signatures & Seals')).toBeInTheDocument();
    expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
  });

  it('2. DocumentsOverview renders metrics, quick actions, and recent documents', async () => {
    renderWithProviders(<DocumentsOverview />);
    await waitFor(() => {
      expect(screen.getByText('Total Documents')).toBeInTheDocument();
      expect(screen.getByText('Quick Document Actions')).toBeInTheDocument();
      expect(screen.getByText('Issue Bonafide Certificate')).toBeInTheDocument();
      expect(screen.getByText('Public Verifier')).toBeInTheDocument();
    });
  });

  it('3. TemplatesView displays template gallery, search bar, and new template button', async () => {
    renderWithProviders(<TemplatesView />);
    await waitFor(() => {
      expect(screen.getByText('New Template')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search templates by code, name, type...')).toBeInTheDocument();
      expect(screen.getByText('Standard Bonafide Certificate')).toBeInTheDocument();
      expect(screen.getByText('BONAFIDE_CERTIFICATE_STD')).toBeInTheDocument();
    });
  });

  it('4. TemplateEditorView renders layout definition editor and variable snippets', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/documents/templates/tpl-1/editor']}>
          <Routes>
            <Route path="/documents/templates/:id/editor" element={<TemplateEditorView />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.getByText('Layout Definition (JSON AST)')).toBeInTheDocument();
      expect(screen.getByText('Available Data Variables (Click to copy)')).toBeInTheDocument();
      expect(screen.getByText('Live PDF Preview')).toBeInTheDocument();
      expect(screen.getByText('Save New Version')).toBeInTheDocument();
    });
  });

  it('5. GenerateDocumentView renders wizard with template selection and auto-finalize toggle', async () => {
    renderWithProviders(<GenerateDocumentView />);
    await waitFor(() => {
      expect(screen.getByText('Issue Certificate or Document')).toBeInTheDocument();
      expect(screen.getByText('Select Document Template')).toBeInTheDocument();
      expect(screen.getByText('Select Student / Recipient')).toBeInTheDocument();
      expect(screen.getByText('Auto-Finalize Immediately')).toBeInTheDocument();
    });
  });

  it('6. GeneratedDocumentsView renders register table, status filters, and action buttons', async () => {
    renderWithProviders(<GeneratedDocumentsView />);
    await waitFor(() => {
      expect(screen.getByText('BON-2026-00001')).toBeInTheDocument();
      expect(screen.getByText('FINALIZED')).toBeInTheDocument();
      expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    });
  });

  it('7. BulkGenerationView renders batch wizard, student multi-selection, and job tracker', async () => {
    renderWithProviders(<BulkGenerationView />);
    await waitFor(() => {
      expect(screen.getByText('Bulk Document & Certificate Generation')).toBeInTheDocument();
      expect(screen.getByText('Select Target Template')).toBeInTheDocument();
      expect(screen.getByText('Toggle Select All Visible')).toBeInTheDocument();
    });
  });

  it('8. SignaturesBrandingView renders signature gallery and upload button', async () => {
    renderWithProviders(<SignaturesBrandingView />);
    await waitFor(() => {
      expect(screen.getByText('Signatures & School Seals')).toBeInTheDocument();
      expect(screen.getByText('Upload Signature / Stamp')).toBeInTheDocument();
      expect(screen.getByText('Principal Signature')).toBeInTheDocument();
      expect(screen.getByText('Dr. Sharma')).toBeInTheDocument();
    });
  });

  it('9. DocumentReportsView renders category metrics and CSV export button', async () => {
    renderWithProviders(<DocumentReportsView />);
    await waitFor(() => {
      expect(screen.getByText('Document Issuance Reports & Analytics')).toBeInTheDocument();
      expect(screen.getByText('Export Register (CSV)')).toBeInTheDocument();
      expect(screen.getByText('Issuances by Category')).toBeInTheDocument();
    });
  });

  it('10. PublicDocumentVerification renders verified authenticity badge and document details with zero recipient identity', async () => {
    render(
      <MemoryRouter initialEntries={['/verify/document/valid-token']}>
        <Routes>
          <Route path="/verify/document/:token" element={<PublicDocumentVerification />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Official Verified Document')).toBeInTheDocument();
      expect(screen.getByText('BON-2026-00001')).toBeInTheDocument();
      expect(screen.getByText('Greenwood High School')).toBeInTheDocument();
      expect(screen.queryByText('A**** S*****')).toBeNull();
    });
  });
});
