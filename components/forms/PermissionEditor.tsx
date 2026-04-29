import React from 'react';
import {
  customerPermissionSections,
  type CustomerPermissions,
} from '../../lib/platform-structure';

interface PermissionEditorProps {
  permissions: CustomerPermissions;
  onChange: (permissions: CustomerPermissions) => void;
  className?: string;
}

const PermissionEditor: React.FC<PermissionEditorProps> = ({
  permissions,
  onChange,
  className = '',
}) => {
  const togglePermission = (permissionId: string) => {
    onChange({
      ...permissions,
      [permissionId]: permissions[permissionId] === 1 ? 0 : 1,
    });
  };

  const toggleSectionPermissions = (sectionId: string) => {
    const section = customerPermissionSections.find((permissionSection) => permissionSection.id === sectionId);

    if (!section) {
      return;
    }

    const toggleItems = section.items.filter((item) => item.kind !== 'label');
    const shouldEnableAll = !toggleItems.every((item) => permissions[item.id] === 1);
    const nextPermissions = { ...permissions };

    toggleItems.forEach((item) => {
      nextPermissions[item.id] = shouldEnableAll ? 1 : 0;
    });

    onChange(nextPermissions);
  };

  return (
    <div className={`permission-builder ${className}`.trim()}>
      {customerPermissionSections.map((section) => {
        const toggleItems = section.items.filter((item) => item.kind !== 'label');
        const enabledCount = toggleItems.filter((item) => permissions[item.id] === 1).length;
        const isSectionEnabled = toggleItems.length > 0 && enabledCount === toggleItems.length;

        return (
          <div key={section.id} className="permission-section">
            <div className="permission-section__header">
              <div>
                <h4 className="permission-section__title">{section.label}</h4>
                <p className="permission-section__meta mb-0">{enabledCount} of {toggleItems.length} enabled</p>
              </div>
              <button
                type="button"
                className={`permission-toggle permission-toggle--section ${isSectionEnabled ? 'is-enabled' : ''}`}
                aria-pressed={isSectionEnabled}
                aria-label={`Toggle all ${section.label} permissions`}
                onClick={() => toggleSectionPermissions(section.id)}
              >
                <span className="permission-toggle__thumb" />
                <span className="permission-toggle__text">{isSectionEnabled ? 'On' : 'Off'}</span>
              </button>
            </div>
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

                const isEnabled = permissions[item.id] === 1;

                return (
                  <div key={item.id} className={`permission-row ${item.indent ? 'permission-row--child' : ''}`}>
                    <span className="permission-label">{item.label}</span>
                    <button
                      type="button"
                      className={`permission-toggle ${isEnabled ? 'is-enabled' : ''}`}
                      aria-pressed={isEnabled}
                      onClick={() => togglePermission(item.id)}
                    >
                      <span className="permission-toggle__thumb" />
                      <span className="permission-toggle__text">{isEnabled ? 'On' : 'Off'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PermissionEditor;
