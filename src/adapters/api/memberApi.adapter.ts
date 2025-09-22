import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { Member } from '../../models/member.model';
import type { IMemberAdapter } from '../member.adapter';


@injectable()
export class MemberApiAdapter
  extends ApiBaseAdapter<Member>
  implements IMemberAdapter
{
  protected basePath = '/members';

  protected mapFromApi(data: any): Member {
    return {
      id: data.id ?? data.Id,
      first_name: data.first_name ?? data.FirstName,
      last_name: data.last_name ?? data.LastName,
      middle_name: data.middle_name ?? data.MiddleName ?? null,
      preferred_name: data.preferred_name ?? data.PreferredName ?? null,
      contact_number: data.contact_number ?? data.ContactNumber,
      address: data.address ?? data.Address,
      email: data.email ?? data.Email ?? null,
      membership_type_id: data.membership_type_id ?? data.MembershipTypeId,
      membership_status_id: data.membership_status_id ?? data.MembershipStatusId,
      membership_date: data.membership_date ?? data.MembershipDate ?? null,
      birthday: data.birthday ?? data.Birthday ?? null,
      profile_picture_url: data.profile_picture_url ?? data.ProfilePictureUrl ?? null,
      gender: data.gender ?? data.Gender,
      marital_status: data.marital_status ?? data.MaritalStatus,
      baptism_date: data.baptism_date ?? data.BaptismDate ?? null,
      spiritual_gifts: data.spiritual_gifts ?? data.SpiritualGifts ?? [],
      ministry_interests: data.ministry_interests ?? data.MinistryInterests ?? [],
      emergency_contact_name: data.emergency_contact_name ?? data.EmergencyContactName ?? null,
      emergency_contact_phone: data.emergency_contact_phone ?? data.EmergencyContactPhone ?? null,
      leadership_position: data.leadership_position ?? data.LeadershipPosition ?? null,
      small_groups: data.small_groups ?? data.SmallGroups ?? [],
      ministries: data.ministries ?? data.Ministries ?? [],
      volunteer_roles: data.volunteer_roles ?? data.VolunteerRoles ?? [],
      attendance_rate: data.attendance_rate ?? data.AttendanceRate ?? null,
      last_attendance_date: data.last_attendance_date ?? data.LastAttendanceDate ?? null,
      pastoral_notes: data.pastoral_notes ?? data.PastoralNotes ?? null,
      prayer_requests: data.prayer_requests ?? data.PrayerRequests ?? [],
      tenant_id: data.tenant_id ?? data.TenantId,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
      membership_type: data.membership_type ?? data.MembershipType
        ? {
            id: data.membership_type?.id ?? data.MembershipType?.Id,
            name: data.membership_type?.name ?? data.MembershipType?.Name,
            code: data.membership_type?.code ?? data.MembershipType?.Code
          }
        : undefined,
      membership_status: data.membership_status ?? data.MembershipStatus
        ? {
            id: data.membership_status?.id ?? data.MembershipStatus?.Id,
            name: data.membership_status?.name ?? data.MembershipStatus?.Name,
            code: data.membership_status?.code ?? data.MembershipStatus?.Code
          }
        : undefined
    } as Member;
  }

  protected mapToApi(data: Partial<Member>) {
    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      middleName: data.middle_name,
      preferredName: data.preferred_name,
      contactNumber: data.contact_number,
      address: data.address,
      email: data.email,
      membershipTypeId: data.membership_type_id,
      membershipStatusId: data.membership_status_id,
      membershipDate: data.membership_date,
      birthday: data.birthday,
      profilePictureUrl: data.profile_picture_url,
      gender: data.gender,
      maritalStatus: data.marital_status,
      baptismDate: data.baptism_date,
      spiritualGifts: data.spiritual_gifts,
      ministryInterests: data.ministry_interests,
      emergencyContactName: data.emergency_contact_name,
      emergencyContactPhone: data.emergency_contact_phone,
      leadershipPosition: data.leadership_position,
      smallGroups: data.small_groups,
      ministries: data.ministries,
      volunteerRoles: data.volunteer_roles,
      attendanceRate: data.attendance_rate,
      lastAttendanceDate: data.last_attendance_date,
      pastoralNotes: data.pastoral_notes,
      prayerRequests: data.prayer_requests
    };
  }

  async getCurrentMonthBirthdays(): Promise<Member[]> {
    return [];
  }

  async getBirthdaysByMonth(_month: number): Promise<Member[]> {
    return [];
  }

  async getCurrentUserMember(): Promise<Member | null> {
    return null;
  }
}
