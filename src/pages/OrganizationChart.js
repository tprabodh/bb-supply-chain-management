import React, { useState, useEffect } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { subscribeToProfiles, updateProfile } from '../services/profileService';
import { updateEmployeeReportsTo } from '../services/reorderService';
import ProfileDetailsModal from '../components/ProfileDetailsModal';
import { toast } from 'react-toastify';

// Simplified Organization Chart (zoom/pan removed)
// - Scrollable & bounded container
// - Collapsible branches
// - Responsive PersonCard sizing

const OrganizationChart = () => {
  const [profiles, setProfiles] = useState([]);
  const [data, setData] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // UX state for map of collapsed node IDs
  const [collapsedMap, setCollapsedMap] = useState({});

  useEffect(() => {
    const unsubscribe = subscribeToProfiles(
      (fetchedProfiles) => {
        setProfiles(fetchedProfiles);
        const tree = buildTree(fetchedProfiles);
        setData(tree);
      },
      (err) => {
        console.error('Error subscribing to profiles:', err);
        toast.error('Error loading organization chart.');
      }
    );

    return () => unsubscribe && unsubscribe();
  }, []);

  useEffect(() => {
    if (!data) return;
    const map = {};
    const walk = (n) => {
      map[n.id] = map[n.id] ?? false; // default expanded
      n.children.forEach(walk);
    };
    walk(data);
    setCollapsedMap(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const buildTree = (profiles) => {
    if (!profiles || profiles.length === 0) return null;

    const profilesById = profiles.reduce((acc, profile) => {
      acc[profile.id] = {
        id: profile.id,
        person: {
          id: profile.id,
          name: profile.name,
          title: profile.subrole,
          empCode: profile.empCode,
        },
        hasParent: !!profile.reportsTo,
        children: [],
        reportsTo: profile.reportsTo,
        fullProfile: profile,
      };
      return acc;
    }, {});

    Object.values(profilesById).forEach((profile) => {
      if (profile.reportsTo && profilesById[profile.reportsTo]) {
        profilesById[profile.reportsTo].children.push(profile);
      }
    });

    return Object.values(profilesById).find((p) => !p.hasParent) || null;
  };

  const handleNodeClick = (profile) => {
    setSelectedProfile(profile);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProfile(null);
  };

  const handleSaveProfile = async (updatedData) => {
    try {
      if (updatedData.reportsTo !== selectedProfile.reportsTo) {
        await updateEmployeeReportsTo(updatedData.id, updatedData.reportsTo, profiles);
      } else {
        await updateProfile(updatedData.id, updatedData);
      }
      toast.success('Profile updated successfully!');
      handleCloseModal();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error updating profile. Please try again.');
    }
  };

  const toggleCollapse = (id) => {
    setCollapsedMap((m) => ({ ...m, [id]: !m[id] }));
  };

  // PersonCard component; shows collapse control when children exist
  const PersonCard = ({ person, fullProfile, nodeId, childCount }) => (
    <div
      className="bg-white p-3 rounded-lg shadow border border-gray-200 min-w-[160px] max-w-xs text-center inline-block cursor-pointer hover:shadow-xl transition-shadow duration-150"
      onClick={() => handleNodeClick(fullProfile)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' ? handleNodeClick(fullProfile) : null)}
      style={{ userSelect: 'none' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-left">
          <p className="font-semibold text-sm text-blue-600 truncate">{person.name}</p>
          <p className="text-gray-500 text-xs truncate">{person.title}</p>
          <p className="text-gray-400 text-[11px] mt-1">{person.empCode}</p>
        </div>

        {childCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(nodeId);
            }}
            aria-label={collapsedMap[nodeId] ? 'Expand' : 'Collapse'}
            className="w-7 h-7 flex items-center justify-center rounded-full border hover:bg-gray-100"
            title={collapsedMap[nodeId] ? 'Expand' : 'Collapse'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              {collapsedMap[nodeId] ? (
                <path fillRule="evenodd" d="M10 5a1 1 0 01.894.553l3 6a1 1 0 01-.788 1.447H6.894a1 1 0 01-.788-1.447l3-6A1 1 0 0110 5z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  const renderTreeNodes = (node) => (
    <TreeNode key={node.id} label={<PersonCard person={node.person} fullProfile={node.fullProfile} nodeId={node.id} childCount={node.children?.length || 0} />}>
      {!collapsedMap[node.id] && node.children && node.children.map((child) => renderTreeNodes(child))}
    </TreeNode>
  );

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50 p-4 gap-4">
      <h1 className="text-3xl font-bold text-gray-900">Organization Chart</h1>

      {/* Chart wrapper (no zoom/pan) */}
      <div className="bg-white p-4 rounded-lg shadow-md w-full max-w-[1200px] h-[70vh] overflow-auto border border-gray-200">
        {data ? (
          <div style={{ padding: 20 }}>
            <Tree
              lineWidth={'2px'}
              lineColor={'#cbd5e1'}
              lineBorderRadius={'10px'}
              label={<PersonCard person={data.person} fullProfile={data.fullProfile} nodeId={data.id} childCount={data.children?.length || 0} />}
            >
              {data.children.map((child) => renderTreeNodes(child))}
            </Tree>
          </div>
        ) : (
          <p>Loading organization chart...</p>
        )}
      </div>

      {isModalOpen && (
        <ProfileDetailsModal
          profile={selectedProfile}
          allProfiles={profiles}
          onClose={handleCloseModal}
          onSave={handleSaveProfile}
        />
      )}

      <div className="text-sm text-gray-500">Tip: use the scrollbars to navigate the chart. Use collapse buttons to hide subtrees.</div>
    </div>
  );
};

export default OrganizationChart;
