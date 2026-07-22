import React from 'react';
import { FaEye, FaPencilAlt } from 'react-icons/fa';
import {
  customerPermissionSections,
  type CustomerPermissions,
} from '../../lib/platform-structure';
import type { PermissionFlag } from '../../lib/permissions/types';

interface PermissionEditorProps {
  permissions: CustomerPermissions;
  onChange: (permissions: CustomerPermissions) => void;
  className?: string;
  ownerPermissions?: CustomerPermissions;
}

const LEVEL_NONE: PermissionFlag = 0;
const LEVEL_READ: PermissionFlag = 1;
const LEVEL_WRITE: PermissionFlag = 2;

const cycleLevel = (current: PermissionFlag): PermissionFlag => {
  if (current === LEVEL_NONE) return LEVEL_READ;
  if (current === LEVEL_READ) return LEVEL_WRITE;
  return LEVEL_NONE;
};

const PermissionEditor: React.FC<PermissionEditorProps> = ({
  permissions,
  onChange,
  className = '',
  ownerPermissions,
}) => {
  const changePermission = (permissionId: string) => {
    const current = permissions[permissionId] ?? LEVEL_NONE;
    const next = cycleLevel(current as PermissionFlag);
    onChange({
      ...permissions,
      [permissionId]: next,
    });
  };

  const cycleSection = (sectionId: string) => {
    const section = customerPermissionSections.find((ps) => ps.id === sectionId);
    if (!section) return;

    const toggleItems = section.items.filter((item) => item.kind !== 'label');
    const levels = toggleItems.map((item) => (permissions[item.id] ?? LEVEL_NONE) as PermissionFlag);

    const allNone = levels.every((l) => l === LEVEL_NONE);
    const allRead = levels.every((l) => l === LEVEL_READ);

    let nextLevel: PermissionFlag;
    if (allNone) {
      nextLevel = LEVEL_READ;
    } else if (allRead) {
      nextLevel = LEVEL_WRITE;
    } else {
      nextLevel = LEVEL_NONE;
    }

    const nextPermissions = { ...permissions };
    toggleItems.forEach((item) => {
      nextPermissions[item.id] = nextLevel;
    });
    onChange(nextPermissions);
  };

  const getFilteredSections = () => {
    if (!ownerPermissions) return customerPermissionSections;

    return customerPermissionSections
      .map((section) => {
        const toggleItems = section.items.filter((item) => item.kind !== 'label');
        const visibleItems = toggleItems.filter((item) => ownerPermissions[item.id] > 0);

        return {
          ...section,
          items: visibleItems.length > 0 ? visibleItems : [],
        };
      })
      .filter((section) => section.items.length > 0);
  };

  return (
    <div className={`permission-builder ${className}`.trim()}>
      {getFilteredSections().map((section) => {
        const toggleItems = section.items.filter((item) => item.kind !== 'label');
        const levels = toggleItems.map((item) => (permissions[item.id] ?? LEVEL_NONE) as PermissionFlag);
        const readCount = levels.filter((l) => l === LEVEL_READ).length;
        const writeCount = levels.filter((l) => l === LEVEL_WRITE).length;
        const noneCount = levels.filter((l) => l === LEVEL_NONE).length;
        const allSame = levels.every((l) => l === levels[0]);

        return (
          <div key={section.id} className="permission-section">
            <div className="permission-section__header">
              <div>
                <h4 className="permission-section__title">{section.label}</h4>
                {section.items.length > 0 && (
                  <p className="permission-section__meta mb-0">{readCount} read / {writeCount} write / {noneCount} none</p>
                )}
              </div>
              {section.items.length > 0 && (
                <button
                  type="button"
                  className="permission-toggle permission-toggle--section"
                  aria-label={`Toggle all ${section.label} permissions`}
                  onClick={() => cycleSection(section.id)}
                >
                  <span className="permission-toggle__text">
                    {allSame && levels[0] === LEVEL_WRITE ? 'Write' : allSame && levels[0] === LEVEL_READ ? 'Read' : 'None'}
                  </span>
                </button>
              )}
            </div>
            {section.items.length > 0 && (
              <div className="permission-list">
                {section.items.map((item) => {
                  if (item.kind === 'label') {
                    return (
                      <div
                        key={item.id}
                        className={`permission-group-label ${item.indent ? 'permission-group-label--child' : ''}`}
                      >
                        {item.label}
                      </div>
                    );
                  }

                  const level = (permissions[item.id] ?? LEVEL_NONE) as PermissionFlag;

                  return (
                    <div key={item.id} className={`permission-row ${item.indent ? 'permission-row--child' : ''}`}>
                      <span className="permission-label">{item.label}</span>
                      <div className="permission-level-group">
                        <button
                          type="button"
                          className={`permission-level-btn ${level === LEVEL_NONE ? 'is-active' : ''}`}
                          title="No access"
                          onClick={() => {
                            if (level !== LEVEL_NONE) {
                              const next = { ...permissions, [item.id]: LEVEL_NONE };
                              onChange(next);
                            }
                          }}
                        >
                          None
                        </button>
                        <button
                          type="button"
                          className={`permission-level-btn permission-level-btn--read ${level === LEVEL_READ ? 'is-active' : ''}`}
                          title="Read only"
                          onClick={() => changePermission(item.id)}
                        >
                          <FaEye className="me-1" />
                          Read
                        </button>
                        <button
                          type="button"
                          className={`permission-level-btn permission-level-btn--write ${level === LEVEL_WRITE ? 'is-active' : ''}`}
                          title="Read and write"
                          onClick={() => changePermission(item.id)}
                        >
                          <FaPencilAlt className="me-1" />
                          Write
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PermissionEditor;
