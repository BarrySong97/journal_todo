import React, { useState } from 'react';

const customStyles = {
  root: {
    '--bg-pink': '#FFC4D6',
    '--bg-red': '#E60023',
    '--bg-green': '#6CE5A8',
    '--bg-blue': '#3B75F2',
    '--bg-white': '#F2F2F2',
    '--text-black': '#050505',
    '--text-white': '#FFFFFF',
    '--font-main': "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
    '--ease-out': 'cubic-bezier(0.23, 1, 0.32, 1)'
  },
  body: {
    fontFamily: "var(--font-main)",
    backgroundColor: '#E0E0E0',
    height: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    color: 'var(--text-black)',
    margin: 0,
    padding: 0,
    WebkitFontSmoothing: 'antialiased',
    boxSizing: 'border-box'
  },
  desktopStage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    zIndex: 0
  },
  stageLeft: {
    backgroundColor: 'var(--bg-white)',
    padding: '60px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  stageRight: {
    backgroundColor: '#DEDEDE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandHeader: {
    fontSize: '14px',
    lineHeight: 1.4,
    fontWeight: 500
  },
  brandHero: {
    fontSize: '8vh',
    lineHeight: 0.9,
    fontWeight: 500,
    letterSpacing: '-0.03em',
    maxWidth: '600px'
  },
  brandFooter: {
    fontSize: '14px',
    maxWidth: '300px',
    lineHeight: 1.4,
    marginBottom: '30px'
  },
  downloadBtn: {
    backgroundColor: 'var(--text-black)',
    color: 'var(--text-white)',
    border: 'none',
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    borderRadius: '4px',
    width: 'fit-content',
    textDecoration: 'none',
    display: 'inline-block'
  },
  appContainer: {
    width: '380px',
    height: '750px',
    backgroundColor: 'var(--bg-white)',
    boxShadow: '0 40px 80px rgba(0,0,0,0.15)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: '4px'
  },
  appHeader: {
    flex: '0 0 auto',
    backgroundColor: 'var(--bg-white)',
    padding: '30px',
    paddingBottom: '10px'
  },
  appMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    fontWeight: 500,
    opacity: 0.8,
    marginBottom: '40px'
  },
  appTitle: {
    fontSize: '36px',
    lineHeight: 1,
    fontWeight: 500,
    letterSpacing: '-0.03em',
    marginBottom: '40px'
  },
  settingsContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 30px 100px 30px'
  },
  settingsGroup: {
    marginBottom: '40px'
  },
  settingsLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#888',
    marginBottom: '16px',
    fontWeight: 600,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  releaseNotesItem: {
    padding: '16px 0',
    borderBottom: '1px solid rgba(0,0,0,0.05)'
  },
  releaseNotesItemLast: {
    borderBottom: 'none'
  },
  releaseVersion: {
    fontSize: '18px',
    fontWeight: 500,
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  releaseDate: {
    fontSize: '12px',
    fontWeight: 400,
    color: '#888'
  },
  changelogList: {
    listStyle: 'none',
    marginTop: '12px'
  },
  changelogListItem: {
    fontSize: '14px',
    lineHeight: 1.5,
    color: '#444',
    marginBottom: '8px',
    paddingLeft: '14px',
    position: 'relative'
  },
  changelogListItemBefore: {
    content: '""',
    position: 'absolute',
    left: 0,
    top: '8px',
    width: '4px',
    height: '4px',
    backgroundColor: 'var(--text-black)',
    borderRadius: '50%'
  },
  tag: {
    fontSize: '9px',
    textTransform: 'uppercase',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '2px',
    marginRight: '6px',
    display: 'inline-block',
    verticalAlign: 'middle'
  },
  tagNew: {
    background: 'var(--bg-green)',
    color: '#000'
  },
  tagFix: {
    background: '#EEE',
    color: '#666'
  },
  actionCircle: {
    position: 'absolute',
    bottom: '30px',
    right: '30px',
    width: '70px',
    height: '70px',
    backgroundColor: 'var(--text-black)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 20,
    transition: 'transform 0.2s var(--ease-out)',
    boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
  },
  actionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-white)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  chevron: {
    fontSize: '12px',
    color: '#AAA',
    cursor: 'pointer',
    transition: 'transform 0.2s var(--ease-out)'
  },
  chevronExpanded: {
    transform: 'rotate(180deg)'
  }
};

const Tag = ({ type, children }) => {
  const tagStyle = type === 'new' ? customStyles.tagNew : customStyles.tagFix;
  return (
    <span style={{ ...customStyles.tag, ...tagStyle }}>
      {children}
    </span>
  );
};

const ChangelogItem = ({ children }) => {
  return (
    <li style={customStyles.changelogListItem}>
      <span style={customStyles.changelogListItemBefore}></span>
      {children}
    </li>
  );
};

const ReleaseNotesItem = ({ version, date, isLatest, children, isLast }) => {
  const [isExpanded, setIsExpanded] = useState(isLatest);

  const handleToggle = () => {
    if (!isLatest) {
      setIsExpanded(!isExpanded);
    }
  };

  const itemStyle = {
    ...customStyles.releaseNotesItem,
    ...(isLast ? customStyles.releaseNotesItemLast : {})
  };

  return (
    <div style={itemStyle}>
      <div style={customStyles.releaseVersion} onClick={handleToggle}>
        {version}
        {isLatest ? (
          <span style={customStyles.releaseDate}>{date}</span>
        ) : (
          <span style={{
            ...customStyles.chevron,
            ...(isExpanded ? customStyles.chevronExpanded : {})
          }}>▼</span>
        )}
      </div>
      {!isLatest && (
        <div style={{ marginTop: '-4px', marginBottom: '12px', ...customStyles.releaseDate }}>
          {date}
        </div>
      )}
      {isExpanded && children && (
        <ul style={customStyles.changelogList}>
          {children}
        </ul>
      )}
    </div>
  );
};

const App = () => {
  const [isModalOpen, setIsModalOpen] = useState(true);

  const handleClose = () => {
    setIsModalOpen(false);
  };

  const handleDownload = () => {
    alert('Download started!');
  };

  return (
    <div style={{ ...customStyles.root, ...customStyles.body }}>
      <div style={customStyles.desktopStage}>
        <div style={customStyles.stageLeft}>
          <div style={customStyles.brandHeader}>
            Journal To Do<br />
            Desktop Client<br />
            v.1.0.4
          </div>
          
          <div style={customStyles.brandHero}>
            History<br />
            of progress.
          </div>

          <div>
            <div style={customStyles.brandFooter}>
              Stay updated with our latest improvements and feature releases. Cloud sync keeps your history intact.
            </div>
            
            <button style={customStyles.downloadBtn} onClick={handleDownload}>
              Download Now
            </button>
          </div>
        </div>

        <div style={customStyles.stageRight}>
          {isModalOpen && (
            <div style={customStyles.appContainer}>
              <div style={customStyles.appHeader}>
                <div style={customStyles.appMeta}>
                  <span>Journal To Do</span>
                  <span>History</span>
                </div>
                <div style={customStyles.appTitle}>Updates</div>
              </div>

              <div style={customStyles.settingsContent}>
                <div style={customStyles.settingsGroup}>
                  <div style={customStyles.settingsLabel}>LATEST RELEASE</div>
                  <ReleaseNotesItem version="v.1.0.4" date="Today" isLatest={true}>
                    <ChangelogItem>
                      <Tag type="new">New</Tag> Focus Mode for deep writing sessions
                    </ChangelogItem>
                    <ChangelogItem>
                      <Tag type="fix">Fix</Tag> Performance improvements for large journals
                    </ChangelogItem>
                    <ChangelogItem>
                      <Tag type="fix">Fix</Tag> Resolved sync conflict on macOS Sonoma
                    </ChangelogItem>
                  </ReleaseNotesItem>
                </div>

                <div style={customStyles.settingsGroup}>
                  <div style={customStyles.settingsLabel}>PREVIOUS VERSIONS</div>
                  
                  <ReleaseNotesItem version="v.1.0.3" date="Oct 12, 2023" isLatest={false} />
                  <ReleaseNotesItem version="v.1.0.2" date="Sep 28, 2023" isLatest={false} />
                  <ReleaseNotesItem version="v.1.0.1" date="Sep 15, 2023" isLatest={false} />
                  <ReleaseNotesItem version="v.1.0.0" date="Aug 30, 2023" isLatest={false} isLast={true} />
                </div>
              </div>

              <div 
                style={customStyles.actionCircle} 
                onClick={handleClose}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span style={customStyles.actionLabel}>Close</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;