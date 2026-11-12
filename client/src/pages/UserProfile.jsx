import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Shield, Calendar, Phone, Building, CheckCircle2, 
  Lock, Camera, Upload, Trash2, Edit3, X, Activity,
  Truck, Package, FileText, AlertTriangle, Navigation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import api from '../services/api';
import { getProfileImageUrl } from '../utils/imageUtils';
import { useLanguage } from '../context/LanguageContext';

const UserProfile = () => {
  const { user, updateUser } = useAuth();
  const { t, translateStatus } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [profileDetails, setProfileDetails] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Edit Profile Form
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editOrganization, setEditOrganization] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Photo Upload State
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const role = user?.role?.toUpperCase() || 'NGO';

  const fetchProfileDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/profile-details');
      if (res.data?.success) {
        setProfileDetails(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load profile operational details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, [user?._id]);

  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditOrganization(user?.organization || '');
    setError('');
    setSuccessMsg('');
    setIsEditModalOpen(true);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setError('');
    try {
      const res = await api.put('/auth/profile', {
        name: editName,
        phone: editPhone,
        organization: editOrganization
      });
      if (res.data?.success) {
        updateUser(res.data.data.user);
        setSuccessMsg(t('profileUpdateSuccess', 'Profile details updated successfully.'));
        setIsEditModalOpen(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('profileUpdateFailed', 'Failed to update profile.'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const openPhotoModal = () => {
    setSelectedPhotoPreview(user?.profileImage ? getProfileImageUrl(user.profileImage) : '');
    setSelectedFile(null);
    setPhotoError('');
    setIsPhotoModalOpen(true);
  };

  const handleFileChange = (e) => {
    setPhotoError('');
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setPhotoError(t('imageTypeError', 'Please select a JPG, JPEG, PNG or WEBP image.'));
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setPhotoError(t('imageSizeError', 'Image must be smaller than 3 MB.'));
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setSelectedPhotoPreview(objectUrl);
  };

  const handlePhotoSave = async () => {
    if (!selectedFile) {
      setPhotoError(t('selectImageFirst', 'Please select an image file to upload.'));
      return;
    }

    if (!(selectedFile instanceof File)) {
      setPhotoError(t('invalidFileError', 'Selected file is invalid. Please select an image again.'));
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError('');

    try {
      const formData = new FormData();
      formData.append('profileImage', selectedFile);

      const res = await api.put('/auth/profile/photo', formData);

      if (res.data?.success) {
        updateUser(res.data.data.user);
        setSuccessMsg(t('photoUpdateSuccess', 'Profile photo updated successfully.'));
        setIsPhotoModalOpen(false);
        setSelectedFile(null);
      }
    } catch (err) {
      console.error('Profile photo save error:', err);
      setPhotoError(err.response?.data?.message || t('photoUpdateFailed', 'Failed to save profile photo.'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePhotoRemove = async () => {
    setIsUploadingPhoto(true);
    setPhotoError('');
    try {
      const res = await api.delete('/auth/profile/photo');
      if (res.data?.success) {
        updateUser(res.data.data.user);
        setSelectedPhotoPreview('');
        setSelectedFile(null);
        setSuccessMsg(t('photoRemoveSuccess', 'Profile photo removed successfully.'));
        setIsPhotoModalOpen(false);
      }
    } catch (err) {
      console.error('Profile photo removal error:', err);
      setPhotoError(err.response?.data?.message || t('photoRemoveFailed', 'Failed to remove photo.'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwordMismatch', 'New password and confirmation do not match.'));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(t('passwordTooShort', 'Password must be at least 6 characters long.'));
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      if (res.data?.success) {
        setSuccessMsg(t('passwordChangeSuccess', 'Password changed successfully.'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsPasswordModalOpen(false);
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || t('passwordChangeFailed', 'Failed to change password.'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getRoleBadgeVariant = (userRole) => {
    switch (userRole) {
      case 'ADMIN': return 'danger';
      case 'DRIVER': return 'warning';
      case 'NGO': return 'success';
      default: return 'info';
    }
  };

  const getRoleDescription = (userRole) => {
    switch (userRole) {
      case 'ADMIN': return t('adminRoleDesc', 'Full system administration and logistics management access.');
      case 'DRIVER': return t('driverRoleDesc', 'Driver operational access and assigned logistics operations.');
      case 'NGO': return t('ngoRoleDesc', 'NGO order management and shipment tracking access.');
      default: return t('defaultRoleDesc', 'Authenticated application access.');
    }
  };

  const getRolePermissions = (userRole) => {
    switch (userRole) {
      case 'ADMIN':
        return [
          { name: t('permUserMgmt', 'User Management'), desc: t('permUserMgmtDesc', 'Manage user accounts, roles & access permissions') },
          { name: t('permOrderMgmt', 'Order Management'), desc: t('permOrderMgmtDesc', 'Approve and oversee humanitarian aid orders') },
          { name: t('permShipmentOps', 'Shipment Operations'), desc: t('permShipmentOpsDesc', 'Create, assign drivers & dispatch shipments') },
          { name: t('permVehicleMgmt', 'Vehicle Management'), desc: t('permVehicleMgmtDesc', 'Fleet allocation, vehicle inventory & status') },
          { name: t('permRouteMgmt', 'Route Management'), desc: t('permRouteMgmtDesc', 'AI route optimization, hazards & corridor selection') },
          { name: t('permAlertsSafety', 'Alerts & Safety'), desc: t('permAlertsSafetyDesc', 'System-wide hazard monitoring & emergency response') },
          { name: t('permReportsAudits', 'Reports & Audits'), desc: t('permReportsAuditsDesc', 'Export operational audit logs & analytics') },
          { name: t('permAnalytics', 'Analytics'), desc: t('permAnalyticsDesc', 'High-level operational performance insights') },
          { name: t('permSysAdmin', 'System Administration'), desc: t('permSysAdminDesc', 'Platform configuration and server health') }
        ];
      case 'DRIVER':
        return [
          { name: t('permAssignedShipments', 'Assigned Shipments'), desc: t('permAssignedShipmentsDesc', 'View and accept assigned shipment tasks') },
          { name: t('permRouteNav', 'Route Navigation'), desc: t('permRouteNavDesc', 'Follow Admin-selected route corridor and guidance') },
          { name: t('permLiveGps', 'Live GPS Telemetry'), desc: t('permLiveGpsDesc', 'Stream real-time location and speed coordinates') },
          { name: t('permAlertSafetyUpdates', 'Alert & Safety Updates'), desc: t('permAlertSafetyUpdatesDesc', 'Receive corridor warnings and weather hazards') },
          { name: t('permDriverReports', 'Driver Reports'), desc: t('permDriverReportsDesc', 'Track personal delivery metrics and export PDF reports') },
          { name: t('permStatusUpdates', 'Status Updates'), desc: t('permStatusUpdatesDesc', 'Mark pickup confirmation and delivery completion') }
        ];
      case 'NGO':
        return [
          { name: t('permCreateReliefOrders', 'Create Relief Orders'), desc: t('permCreateReliefOrdersDesc', 'Submit humanitarian supply requests') },
          { name: t('permOwnOrders', 'Own Orders'), desc: t('permOwnOrdersDesc', 'Monitor status and approval of submitted orders') },
          { name: t('permShipmentTracking', 'Shipment Tracking'), desc: t('permShipmentTrackingDesc', 'Track live location of linked relief shipments') },
          { name: t('permRelevantAlerts', 'Relevant Alerts'), desc: t('permRelevantAlertsDesc', 'View safety updates on requested shipments') },
          { name: t('permOrderConfirm', 'Order Status'), desc: t('permOrderConfirmDesc', 'Confirm delivery receipt for aid packages') }
        ];
      default:
        return [];
    }
  };

  const formatRegisteredDate = (dateVal) => {
    if (!dateVal) return t('na', 'N/A');
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return t('na', 'N/A');
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return t('na', 'N/A');
    }
  };

  const roleOps = profileDetails?.roleOperations || {};

  return (
    <div className="space-y-6 text-xs text-customText max-w-[1600px] mx-auto p-1">
      <PageHeader
        title={t('profileDetails', 'Profile Details')}
        description={t('profileSub', 'View and manage your account details, security credentials, role permissions, and operational status.')}
      />

      {successMsg && (
        <div className="p-3.5 bg-customSuccess/10 border border-customSuccess/30 text-customSuccess rounded-xl font-bold flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-customSuccess hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-customDanger/10 border border-customDanger/30 text-customDanger rounded-xl font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-customDanger hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: PROFILE HEADER & SECURITY */}
        <div className="space-y-6 lg:col-span-1">
          {/* PROFILE CARD */}
          <Card className="bg-darkCard border border-darkBorder">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                {/* CIRCULAR PROFILE IMAGE */}
                <div className="relative group cursor-pointer" onClick={openPhotoModal}>
                  {user?.profileImage ? (
                    <img
                      src={getProfileImageUrl(user.profileImage)}
                      alt={user?.name}
                      className="w-28 h-28 rounded-full object-cover border-4 border-customPrimary/40 shadow-[0_0_25px_rgba(168,85,247,0.3)] transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-customPrimary/15 border-4 border-customPrimary/40 text-customPrimary flex items-center justify-center font-black text-3xl shadow-[0_0_25px_rgba(168,85,247,0.3)] transition-transform group-hover:scale-105">
                      {getInitials(user?.name || 'User')}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity font-bold text-[10px]">
                    <Camera className="w-5 h-5 mb-1 text-customPrimary" />
                    <span>{t('changePhoto', 'CHANGE PHOTO')}</span>
                  </div>
                </div>

                {/* NAME & ROLE BADGE */}
                <div className="space-y-1.5 w-full">
                  <h2 className="text-xl font-extrabold text-customText">{user?.name || t('userProfile', 'User Profile')}</h2>
                  <div className="flex justify-center">
                    <Badge variant={getRoleBadgeVariant(role)} className="px-3 py-1 font-bold text-xs uppercase tracking-wider">
                      {t(`role${role.charAt(0) + role.slice(1).toLowerCase()}`, role)}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-customMuted mt-1 leading-relaxed px-2">
                    {getRoleDescription(role)}
                  </p>
                </div>

                {/* EMAIL */}
                <div className="w-full pt-3 border-t border-darkBorder/40 flex items-center justify-center gap-2 text-customMuted font-mono text-[11px]">
                  <Mail className="w-3.5 h-3.5 text-customPrimary shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>

                {/* ACTION BUTTONS */}
                <div className="w-full pt-2 grid grid-cols-2 gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={openEditModal}
                    className="font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 py-2"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{t('editProfile', 'EDIT PROFILE')}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openPhotoModal}
                    className="font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 py-2"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{t('photoBtn', 'PHOTO')}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECURITY CARD */}
          <Card className="bg-darkCard border border-darkBorder">
            <CardHeader className="pb-3 border-b border-darkBorder">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-customPrimary flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-customPrimary" />
                {t('securityCredentials', 'SECURITY & CREDENTIALS')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center bg-darkBgSecondary/40 p-3 rounded-lg border border-darkBorder/40">
                <div>
                  <span className="text-[10px] text-customMuted font-bold uppercase block">{t('password', 'Password')}</span>
                  <span className="font-mono text-customText tracking-widest text-sm">••••••••••••</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPasswordError('');
                    setIsPasswordModalOpen(true);
                  }}
                  className="font-bold text-[10px] uppercase py-1.5"
                >
                  {t('changePassword', 'CHANGE PASSWORD')}
                </Button>
              </div>

              <div className="flex justify-between items-center bg-darkBgSecondary/40 p-3 rounded-lg border border-darkBorder/40">
                <div>
                  <span className="text-[10px] text-customMuted font-bold uppercase block">{t('emailVerification', 'Email Verification')}</span>
                  <span className="font-semibold text-customSuccess flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t('verified', 'Verified')}
                  </span>
                </div>
                <Badge variant="success">{t('accountActiveBadge', 'Active')}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: ACCOUNT INFORMATION & ROLE OPERATIONS */}
        <div className="space-y-6 lg:col-span-2">
          {/* ACCOUNT INFORMATION CARD */}
          <Card className="bg-darkCard border border-darkBorder">
            <CardHeader className="pb-3 border-b border-darkBorder flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                <User className="w-4 h-4 text-customPrimary" />
                {t('accountInformation', 'ACCOUNT INFORMATION')}
              </CardTitle>
              <Badge variant="success">{t('accountActive', 'Account Active')}</Badge>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-darkBgSecondary/40 border border-darkBorder/40 rounded-lg p-3 space-y-1">
                  <span className="text-[9px] text-customMuted font-bold uppercase block">{t('fullName', 'Full Name')}</span>
                  <strong className="text-customText font-bold block">{user?.name || t('na', 'N/A')}</strong>
                </div>

                <div className="bg-darkBgSecondary/40 border border-darkBorder/40 rounded-lg p-3 space-y-1">
                  <span className="text-[9px] text-customMuted font-bold uppercase block">{t('emailAddress', 'Email Address')}</span>
                  <strong className="text-customText font-mono font-semibold block truncate">{user?.email || t('na', 'N/A')}</strong>
                </div>

                <div className="bg-darkBgSecondary/40 border border-darkBorder/40 rounded-lg p-3 space-y-1">
                  <span className="text-[9px] text-customMuted font-bold uppercase block">{t('phoneNumber', 'Phone Number')}</span>
                  <strong className="text-customText font-semibold block">{user?.phone || t('na', 'N/A')}</strong>
                </div>

                {role === 'NGO' && (
                  <div className="bg-darkBgSecondary/40 border border-darkBorder/40 rounded-lg p-3 space-y-1">
                    <span className="text-[9px] text-customMuted font-bold uppercase block">{t('organization', 'Organization')}</span>
                    <strong className="text-customText font-semibold block">{user?.organization || t('na', 'N/A')}</strong>
                  </div>
                )}

                <div className="bg-darkBgSecondary/40 border border-darkBorder/40 rounded-lg p-3 space-y-1">
                  <span className="text-[9px] text-customMuted font-bold uppercase block">{t('userRoleReadOnly', 'User Role (Read-Only)')}</span>
                  <strong className="text-customPrimary font-bold block uppercase">{t(`role${role.charAt(0) + role.slice(1).toLowerCase()}`, role)}</strong>
                </div>

                <div className="bg-darkBgSecondary/40 border border-darkBorder/40 rounded-lg p-3 space-y-1">
                  <span className="text-[9px] text-customMuted font-bold uppercase block">{t('userId', 'User ID')}</span>
                  <strong className="text-customMuted font-mono text-[10px] block truncate">{user?._id || t('na', 'N/A')}</strong>
                </div>

                <div className="bg-darkBgSecondary/40 border border-darkBorder/40 rounded-lg p-3 space-y-1">
                  <span className="text-[9px] text-customMuted font-bold uppercase block">{t('accountRegisteredDate', 'Account Registered Date')}</span>
                  <strong className="text-customText font-mono block">
                    {formatRegisteredDate(user?.createdAt)}
                  </strong>
                </div>

                <div className="bg-darkBgSecondary/40 border border-darkBorder/40 rounded-lg p-3 space-y-1">
                  <span className="text-[9px] text-customMuted font-bold uppercase block">{t('lastLoginActivity', 'Last Login / Activity')}</span>
                  <strong className="text-customSuccess font-mono block">
                    {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : t('na', 'N/A')}
                  </strong>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ROLE-SPECIFIC OPERATIONAL OVERVIEW CARD */}
          <Card className="bg-darkCard border border-darkBorder">
            <CardHeader className="pb-3 border-b border-darkBorder">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                {role === 'ADMIN' ? <Shield className="w-4 h-4 text-customDanger" /> :
                 role === 'DRIVER' ? <Truck className="w-4 h-4 text-customWarning" /> :
                 <Building className="w-4 h-4 text-customSuccess" />}
                {t(`role${role.charAt(0) + role.slice(1).toLowerCase()}`, role)} {t('operationalOverview', 'OPERATIONAL OVERVIEW')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner size="sm" text={t('fetchingMetrics', 'Fetching role operations metrics...')} />
                </div>
              ) : role === 'ADMIN' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                    <span className="text-[9px] text-customMuted uppercase block font-bold">{t('totalSystemUsers', 'Total System Users')}</span>
                    <strong className="text-lg font-bold text-customText">{roleOps.totalUsers ?? 0}</strong>
                  </div>
                  <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                    <span className="text-[9px] text-customMuted uppercase block font-bold">{t('totalShipments', 'Total Shipments')}</span>
                    <strong className="text-lg font-bold text-customPrimary">{roleOps.totalShipments ?? 0}</strong>
                  </div>
                  <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                    <span className="text-[9px] text-customMuted uppercase block font-bold">{t('activeEnRoute', 'Active En Route')}</span>
                    <strong className="text-lg font-bold text-customWarning">{roleOps.activeShipments ?? 0}</strong>
                  </div>
                  <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                    <span className="text-[9px] text-customMuted uppercase block font-bold">{t('activeSafetyAlerts', 'Active Safety Alerts')}</span>
                    <strong className="text-lg font-bold text-customDanger">{roleOps.activeAlerts ?? 0}</strong>
                  </div>
                  <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                    <span className="text-[9px] text-customMuted uppercase block font-bold">{t('vehiclesInFleet', 'Vehicles In Fleet')}</span>
                    <strong className="text-lg font-bold text-customSecondary">{roleOps.vehiclesCount ?? 0}</strong>
                  </div>
                  <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                    <span className="text-[9px] text-customMuted uppercase block font-bold">{t('configuredCorridors', 'Configured Corridors')}</span>
                    <strong className="text-lg font-bold text-purple-400">{roleOps.routesCount ?? 0}</strong>
                  </div>
                </div>
              ) : role === 'DRIVER' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                      <span className="text-[9px] text-customMuted uppercase block font-bold">{t('assignedShipments', 'Assigned Shipments')}</span>
                      <strong className="text-lg font-bold text-customText">{roleOps.assignedShipmentsCount ?? 0}</strong>
                    </div>
                    <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                      <span className="text-[9px] text-customMuted uppercase block font-bold">{t('assignedVehicle', 'Assigned Vehicle')}</span>
                      <strong className="text-sm font-bold text-customPrimary font-mono block truncate">{roleOps.assignedVehicleReg || t('notSpecified', 'NOT SPECIFIED')}</strong>
                    </div>
                    <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                      <span className="text-[9px] text-customMuted uppercase block font-bold">{t('gpsSignal', 'GPS Signal')}</span>
                      <strong className="text-xs font-bold text-customSuccess block truncate">
                        {translateStatus(roleOps.liveLocationStatus === 'Active GPS Signal' ? 'ACTIVE' : (roleOps.liveLocationStatus || 'N/A'))}
                      </strong>
                    </div>
                    <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                      <span className="text-[9px] text-customMuted uppercase block font-bold">{t('corridorAlerts', 'Corridor Alerts')}</span>
                      <strong className="text-lg font-bold text-customWarning">{roleOps.activeAlertsCount ?? 0}</strong>
                    </div>
                  </div>

                  <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40 space-y-1">
                    <span className="text-[9px] text-customMuted uppercase font-bold block">{t('currentActiveShipment', 'Current Active Shipment')}</span>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <strong className="text-customText font-mono font-bold">{roleOps.activeShipmentId || t('noActiveShipment', 'NO ACTIVE SHIPMENT')}</strong>
                      {roleOps.activeShipmentId && roleOps.activeShipmentId !== 'NO ACTIVE SHIPMENT' && (
                        <Badge variant={roleOps.activeShipmentStatus === 'IN_TRANSIT' ? 'warning' : 'info'}>
                          {translateStatus(roleOps.activeShipmentStatus || 'IDLE')}
                        </Badge>
                      )}
                    </div>
                    {roleOps.activeShipmentFrom && roleOps.activeShipmentFrom !== 'N/A' && (
                      <div className="text-[10px] text-customMuted pt-1">
                        {roleOps.activeShipmentFrom} → <span className="text-customSuccess font-semibold">{roleOps.activeShipmentTo}</span> ({roleOps.currentRouteName})
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                      <span className="text-[9px] text-customMuted uppercase block font-bold">{t('totalOrders', 'Total Orders')}</span>
                      <strong className="text-lg font-bold text-customText">{roleOps.totalOrders ?? 0}</strong>
                    </div>
                    <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                      <span className="text-[9px] text-customMuted uppercase block font-bold">{t('activeOrders', 'Active Orders')}</span>
                      <strong className="text-lg font-bold text-customWarning">{roleOps.activeOrders ?? 0}</strong>
                    </div>
                    <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                      <span className="text-[9px] text-customMuted uppercase block font-bold">{t('completedAid', 'Completed Aid')}</span>
                      <strong className="text-lg font-bold text-customSuccess">{roleOps.completedOrders ?? 0}</strong>
                    </div>
                    <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                      <span className="text-[9px] text-customMuted uppercase block font-bold">{t('trackedShipments', 'Tracked Shipments')}</span>
                      <strong className="text-lg font-bold text-customPrimary">{roleOps.totalShipments ?? 0}</strong>
                    </div>
                  </div>

                  {roleOps.recentOrderId && roleOps.recentOrderId !== 'N/A' && (
                    <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-customMuted uppercase font-bold block">{t('mostRecentOrder', 'Most Recent Order')}</span>
                        <strong className="text-customText font-mono">{roleOps.recentOrderId}</strong>
                      </div>
                      <Badge variant={roleOps.recentOrderStatus === 'COMPLETED' ? 'success' : 'warning'}>
                        {translateStatus(roleOps.recentOrderStatus)}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FULL WIDTH ROLE ACCESS PERMISSIONS CARD */}
      <div className="w-full">
        <Card className="bg-darkCard border border-darkBorder w-full">
          <CardHeader className="pb-3 border-b border-darkBorder">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-customPrimary flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-customPrimary" />
              {t('roleAccessPermissions', 'ROLE ACCESS PERMISSIONS')} ({t(`role${role.charAt(0) + role.slice(1).toLowerCase()}`, role)})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs w-full">
              {getRolePermissions(role).map((perm, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/30">
                  <CheckCircle2 className="w-4 h-4 text-customSuccess shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-customText font-semibold block">{perm.name}</strong>
                    <span className="text-[10px] text-customMuted">{perm.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-darkCard border border-darkBorder w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-darkBorder pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-customPrimary flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                {t('editProfileDetails', 'Edit Profile Details')}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-customMuted hover:text-customText">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-customMuted font-bold uppercase mb-1">{t('fullName', 'Full Name')}</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('enterFullName', 'Enter full name')}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-customMuted font-bold uppercase mb-1">{t('phoneNumber', 'Phone Number')}</label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>

              {role === 'NGO' && (
                <div>
                  <label className="block text-[10px] text-customMuted font-bold uppercase mb-1">{t('organization', 'Organization')}</label>
                  <Input
                    value={editOrganization}
                    onChange={(e) => setEditOrganization(e.target.value)}
                    placeholder={t('organizationName', 'Organization Name')}
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] text-customMuted font-bold uppercase mb-1">{t('userRoleReadOnly', 'User Role (Read-Only)')}</label>
                <input
                  type="text"
                  value={t(`role${role.charAt(0) + role.slice(1).toLowerCase()}`, role)}
                  disabled
                  className="w-full bg-darkBgSecondary/60 border border-darkBorder text-customMuted p-2 rounded-lg text-xs font-mono font-bold uppercase cursor-not-allowed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-darkBorder/40">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsEditModalOpen(false)}>
                  {t('cancel', 'Cancel')}
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? t('saving', 'Saving...') : t('saveChanges', 'Save Changes')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHOTO UPLOAD MODAL */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-darkCard border border-darkBorder w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-darkBorder pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-customPrimary flex items-center gap-2">
                <Camera className="w-4 h-4" />
                {t('changeProfilePhoto', 'Change Profile Photo')}
              </h3>
              <button onClick={() => setIsPhotoModalOpen(false)} className="text-customMuted hover:text-customText">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex flex-col items-center justify-center space-y-3 p-4 bg-darkBgSecondary/30 rounded-xl border border-darkBorder/40">
                {selectedPhotoPreview ? (
                  <img
                    src={selectedPhotoPreview}
                    alt="Preview"
                    className="w-32 h-32 rounded-full object-cover border-4 border-customPrimary/40 shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-customPrimary/15 border-4 border-customPrimary/40 text-customPrimary flex items-center justify-center font-black text-4xl shadow-lg">
                    {getInitials(user?.name || 'User')}
                  </div>
                )}

                <label className="cursor-pointer bg-darkBgSecondary hover:bg-darkBorder/50 text-customText px-4 py-2 rounded-lg border border-darkBorder font-bold uppercase tracking-wider text-[10px] flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5 text-customPrimary" />
                  {t('selectImageFile', 'Select Image File')}
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onClick={(e) => { e.target.value = null; }}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <span className="text-[9px] text-customMuted">{t('supportedFormats', 'Supported: JPG, JPEG, PNG, WEBP (Max 3MB)')}</span>
              </div>

              {photoError && (
                <div className="p-2.5 bg-customDanger/10 border border-customDanger/25 text-customDanger rounded-lg text-[10px] font-bold">
                  {photoError}
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-darkBorder/40">
                {user?.profileImage ? (
                  <Button variant="danger" size="sm" type="button" onClick={handlePhotoRemove} disabled={isUploadingPhoto}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> {t('removePhoto', 'REMOVE PHOTO')}
                  </Button>
                ) : <div />}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setIsPhotoModalOpen(false)}>
                    {t('cancel', 'Cancel')}
                  </Button>
                  <Button variant="primary" size="sm" type="button" onClick={handlePhotoSave} disabled={isUploadingPhoto || !selectedFile}>
                    {isUploadingPhoto ? t('uploading', 'Uploading...') : t('savePhoto', 'SAVE PHOTO')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-darkCard border border-darkBorder w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-darkBorder pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-customPrimary flex items-center gap-2">
                <Lock className="w-4 h-4" />
                {t('changePassword', 'Change Password')}
              </h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-customMuted hover:text-customText">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-customMuted font-bold uppercase mb-1">{t('currentPassword', 'Current Password')}</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('enterCurrentPassword', 'Enter current password')}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-customMuted font-bold uppercase mb-1">{t('newPassword', 'New Password')}</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('atLeast6Chars', 'At least 6 characters')}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-customMuted font-bold uppercase mb-1">{t('confirmNewPassword', 'Confirm New Password')}</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('confirmNewPasswordPlaceholder', 'Confirm new password')}
                  required
                />
              </div>

              {passwordError && (
                <div className="p-2.5 bg-customDanger/10 border border-customDanger/25 text-customDanger rounded-lg text-[10px] font-bold">
                  {passwordError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-darkBorder/40">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsPasswordModalOpen(false)}>
                  {t('cancel', 'Cancel')}
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? t('updating', 'Updating...') : t('updatePassword', 'Update Password')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
