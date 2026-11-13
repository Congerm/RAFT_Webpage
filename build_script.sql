-- RAFT 3 Implementation: solution script (PostgreSQL)
-- destroy anything already in the raft schema, rebuild it, and make it the default for the rest of this script.
DROP SCHEMA IF EXISTS raft CASCADE;
CREATE SCHEMA raft;
SET search_path TO raft;

/* Superclass: contact information is stored once, here */
create table Person(
	PersonID int GENERATED ALWAYS as IDENTITY(START with 100) primary key,
	FirstName varchar(50),
	LastName varchar(50),
	Address varchar(50),
	City varchar(50),
	State char(2),
	ZIP char(10),
	Phone varchar(14),
	Email varchar(100)
);

/* Subclasses: each primary key is also a foreign key to Person.
   The generalization is overlapping, so one person can have a row in several of these. */
create table Counselor(
	CounselorID int primary key references Person,
	DegreeSuffix varchar(50)
);

create table Client(
	ClientID int primary key references Person,
	FoundOut varchar(50),
	ReminderMethod varchar(50),
	ReferredBy int references Client          -- 0..1: optional
);

create table Employee(
	EmployeeID int primary key references Person,
	DateHired date,
	Wage numeric(4,2),
	SupervisorID int not null references Employee   -- 1..1: Holly supervises herself
);

create table Family_Member(
	MemberID int primary key references Person
);

/* Carried over from RAFT 2 */
create table Room(
	RoomNumber int primary key,
	RoomName varchar(50)
);

create table Appointment(
	AppointmentID int GENERATED ALWAYS as IDENTITY(START with 1000) primary key,
	AppointmentTime timestamp,
	Duration int,
	CounselorID int not null references Counselor,
	EmployeeID int not null references Employee,
	RoomNumber int not null references Room,
	Notes varchar(3000)
);

create table ScheduledFor(
	AppointmentID int references Appointment,
	ClientID int references Client,
	Assignment varchar(2000),
	Kept boolean,
	primary key (AppointmentID, ClientID)
);

/* Families, membership and roles */
create table Family(
	FamilyID int GENERATED ALWAYS as IDENTITY(START with 500) primary key,
	FamilyName varchar(100),
	DateFounded date
);

-- association class: one row per person per family, so a person can belong to several families
create table Member_In_Family(
	FamilyID int references Family,
	MemberID int references Family_Member,
	DateJoined date,
	primary key (FamilyID, MemberID)
);

create table Role(
	RoleID int GENERATED ALWAYS as IDENTITY(START with 600) primary key,
	RoleName varchar(50) unique
);

-- roles hang off the membership, so a person can play different roles in different families
create table Member_Role(
	FamilyID int,
	MemberID int,
	RoleID int references Role,
	primary key (FamilyID, MemberID, RoleID),
	foreign key (FamilyID, MemberID) references Member_In_Family
);



/* data for People -- everyone once */
insert into Person(firstname, lastname, address, city, state, zip, phone, email) values
	('Quinn','Fowler','5208 Walmsley Blvd','Richmond','VA','23224','(804) 286-4422','qfowler@raftcounseling.com'),
	('Elizabeth','Baker','3409 Irvington St','Richmond','VA','23234','(804) 539-9337','ebaker@raftcounseling.com'),
	('Darold','Cooper','4003 Corbin St','Richmond','VA','23222','(804) 286-4422','dbcooper@raftcounseling.com'),
	('Diana','Chandler','600 Idlewood Ave','Richmond','VA','23220','(804) 737-9704','dchandler@raftcounseling.com'),
	('Phoebe','Wright','707 Old Locke Lane','Richmond','VA','23226','(804) 592-0056','pwright@raftcounseling.com'),
	('Randall','Mason','3513 A Grove Ave','Richmond','VA','23221','(804) 612-2961','masonjar27@msn.com'),
	('Leola','White','1625 W Laburnum Ave','Richmond','VA','23227','(804) 786-0698','thewhitehouse@yahoo.com'),
	('Tyrone','McSweeney','5717 Campbell Ave','Richmond','VA','23231','(804) 518-7098','Janessa1820@gmail.com'),
	('Shannon','Fake','3019 E Marshall St','Richmond','VA','23223','(804) 223-8622','therealshannon@gmail.com'),
	('Yasini','Brothers','205 Wickham St','Richmond','VA','23222','(804) 966-8112','brothersk@me.com'),
	('Wendi','Overton','915 N 33rd St','Richmond','VA','23223','(804) 649-6464','wendycity99@gmail.com'),
	('Bessie','Murchison','2918 Edgewood Ave','Richmond','VA','23222','(804) 620-9185','bmurch77@yahoo.com'),
	('Bernice','Mason','3513 A Grove Ave','Richmond','VA','23221','(804) 612-2961','masonjar27@msn.com'),
	('Russ','Overton','915 N 33rd St','Richmond','VA','23223','(804) 649-6464','russ.overon.1982@gmail.com'),
	('Samantha','Murchison','2918 Edgewood Ave','Richmond','VA','23222','(804) 620-9185','samantha.murch.2002@yahoo.com'),
	('Holly','White','1414 Rogers St','Richmond','VA','23223','(804) 640-6817','hollyw@raftcounseling.com'),
	('Mark','Lucas','1203 1/2 Oakwood Ave','Richmond','VA','23223','(804) 327-2454','markl@raftcounseling.com'),
	('John','Taylor','913 N 3rd St','Richmond','VA','23219','(804) 331-2700','johnt@raftcounseling.com'),
	('Molly','Helgeson','900 Maggie Walker Ave','Richmond','VA','23222','(804) 888-0759','mollyh@raftcounseling.com'),
	('Kayla','Overton','915 N 33rd St','Richmond','VA','23223','(804) 649-6471','kayla.overton06@gmail.com'),
	('Doris','Hughes','2210 Fairmount Ave','Richmond','VA','23223','(804) 643-1187','dorishughes48@aol.com');


/* data for Counselors */
insert into Counselor(CounselorID, DegreeSuffix)
	select PersonID, s.suffix
	from Person p join (values
		('Quinn','Fowler','MS'),
		('Elizabeth','Baker','PhD'),
		('Darold','Cooper','MFT'),
		('Diana','Chandler','EdD'),
		('Phoebe','Wright','MFT')
	) as s(fn, ln, suffix) on p.FirstName = s.fn and p.LastName = s.ln;


/* data for Clients (referrals are filled in after every client exists) */
insert into Client(ClientID, FoundOut, ReminderMethod)
	select PersonID, s.foundout, s.reminder
	from Person p join (values
		('Randall','Mason','Radio','Phone'),
		('Leola','White','Billboard','Text'),
		('Tyrone','McSweeney','Family','Text'),
		('Shannon','Fake','Billboard','Email'),
		('Yasini','Brothers','Family','Text'),
		('Wendi','Overton','Family','Text'),
		('Bessie','Murchison',null,'Postcard'),
		('Bernice','Mason','Radio','Phone'),
		('Russ','Overton','Family','Text'),
		('Samantha','Murchison',null,'Postcard')
	) as s(fn, ln, foundout, reminder) on p.FirstName = s.fn and p.LastName = s.ln;

update Client c set ReferredBy = r.PersonID
	from (values
		('Tyrone','McSweeney','Leola','White'),
		('Yasini','Brothers','Shannon','Fake'),
		('Wendi','Overton','Shannon','Fake'),
		('Bessie','Murchison','Shannon','Fake'),
		('Russ','Overton','Wendi','Overton'),
		('Samantha','Murchison','Bessie','Murchison')
	) as s(fn, ln, rfn, rln)
	join Person p on p.FirstName = s.fn and p.LastName = s.ln
	join Person r on r.FirstName = s.rfn and r.LastName = s.rln
	where c.ClientID = p.PersonID;


/* data for Employees -- Holly first, since she supervises herself */
insert into Employee(EmployeeID, DateHired, Wage, SupervisorID)
	select PersonID, '2013-07-01', 17.50, PersonID
	from Person where FirstName = 'Holly' and LastName = 'White';

insert into Employee(EmployeeID, DateHired, Wage, SupervisorID)
	select p.PersonID, s.hired::date, s.wage, sup.PersonID
	from (values
		('Mark','Lucas','2013-09-01',15.00,'Holly','White'),
		('Phoebe','Wright','2019-03-15',24.00,'Holly','White')
	) as s(fn, ln, hired, wage, sfn, sln)
	join Person p on p.FirstName = s.fn and p.LastName = s.ln
	join Person sup on sup.FirstName = s.sfn and sup.LastName = s.sln;

insert into Employee(EmployeeID, DateHired, Wage, SupervisorID)
	select p.PersonID, s.hired::date, s.wage, sup.PersonID
	from (values
		('John','Taylor','2020-08-01',15.00,'Mark','Lucas'),
		('Molly','Helgeson','2013-06-01',16.80,'Mark','Lucas')
	) as s(fn, ln, hired, wage, sfn, sln)
	join Person p on p.FirstName = s.fn and p.LastName = s.ln
	join Person sup on sup.FirstName = s.sfn and sup.LastName = s.sln;


/* data for Family Members -- everyone who belongs to a family */
insert into Family_Member(MemberID)
	select PersonID from Person p join (values
		('Wendi','Overton'), ('Russ','Overton'), ('Kayla','Overton'),
		('Randall','Mason'), ('Bernice','Mason'),
		('Bessie','Murchison'), ('Samantha','Murchison'),
		('Doris','Hughes')
	) as s(fn, ln) on p.FirstName = s.fn and p.LastName = s.ln;


/* data for Families */
insert into Family(FamilyName, DateFounded) values
	('Overton','2004-06-12'),
	('Mason','1998-05-02'),
	('Murchison','2002-01-15'),
	('Hughes','1970-08-08');


/* data for Roles */
insert into Role(RoleName) values
	('Mother'), ('Father'), ('Daughter'), ('Bread winner'), ('Comic'),
	('Peacemaker'), ('Enabler'), ('Matriarch');


/* data for memberships */
insert into Member_In_Family(FamilyID, MemberID, DateJoined)
	select f.FamilyID, p.PersonID, s.joined::date
	from (values
		('Wendi','Overton','Overton','2004-06-12'),
		('Russ','Overton','Overton','2004-06-12'),
		('Kayla','Overton','Overton','2006-02-20'),
		('Randall','Mason','Mason','1998-05-02'),
		('Bernice','Mason','Mason','1998-05-02'),
		('Bessie','Murchison','Murchison','2002-01-15'),
		('Samantha','Murchison','Murchison','2002-01-15'),
		('Doris','Hughes','Hughes','1970-08-08'),
		('Bernice','Mason','Hughes','1972-03-30'),
		('Bessie','Murchison','Hughes','1975-11-04')
	) as s(fn, ln, family, joined)
	join Person p on p.FirstName = s.fn and p.LastName = s.ln
	join Family f on f.FamilyName = s.family;


/* data for each member's roles in each family */
insert into Member_Role(FamilyID, MemberID, RoleID)
	select f.FamilyID, p.PersonID, r.RoleID
	from (values
		('Wendi','Overton','Overton','Mother'),
		('Wendi','Overton','Overton','Bread winner'),
		('Russ','Overton','Overton','Father'),
		('Russ','Overton','Overton','Comic'),
		('Kayla','Overton','Overton','Daughter'),
		('Kayla','Overton','Overton','Peacemaker'),
		('Randall','Mason','Mason','Father'),
		('Randall','Mason','Mason','Bread winner'),
		('Bernice','Mason','Mason','Mother'),
		('Bernice','Mason','Mason','Enabler'),
		('Bessie','Murchison','Murchison','Mother'),
		('Bessie','Murchison','Murchison','Bread winner'),
		('Samantha','Murchison','Murchison','Daughter'),
		('Doris','Hughes','Hughes','Mother'),
		('Doris','Hughes','Hughes','Matriarch'),
		('Bernice','Mason','Hughes','Daughter'),
		('Bernice','Mason','Hughes','Comic'),
		('Bessie','Murchison','Hughes','Daughter'),
		('Bessie','Murchison','Hughes','Peacemaker')
	) as s(fn, ln, family, role)
	join Person p on p.FirstName = s.fn and p.LastName = s.ln
	join Family f on f.FamilyName = s.family
	join Role r on r.RoleName = s.role;


/* data for Rooms */
insert into Room(RoomNumber, RoomName) values
	(1,'Clear sky'),
	(2,'Flowing waters'),
	(3,'Calm ocean'),
	(4,'Peaceful woods');


/* data for Appointments, each followed by the clients scheduled for it */
insert into Appointment(AppointmentTime, Duration, CounselorID, EmployeeID, RoomNumber)
	values('2024-10-01 08:00', 90,
		(select PersonID from Person where FirstName='Elizabeth' and LastName='Baker'),
		(select PersonID from Person where FirstName='Holly' and LastName='White'),
		1);
	insert into ScheduledFor values(
		(select max(AppointmentID) from Appointment),
		(select PersonID from Person where FirstName='Wendi' and LastName='Overton'),
		'Write a letter to Russ listing the things that you are glad he does for the family.', TRUE);
	insert into ScheduledFor values(
		(select max(AppointmentID) from Appointment),
		(select PersonID from Person where FirstName='Russ' and LastName='Overton'),
		'Write a letter to Wendi explaining how you first fell in love with her.', TRUE);

insert into Appointment(AppointmentTime, Duration, CounselorID, EmployeeID, RoomNumber)
	values('2024-10-01 11:00', 60,
		(select PersonID from Person where FirstName='Elizabeth' and LastName='Baker'),
		(select PersonID from Person where FirstName='Holly' and LastName='White'),
		1);
	insert into ScheduledFor values(
		(select max(AppointmentID) from Appointment),
		(select PersonID from Person where FirstName='Bessie' and LastName='Murchison'),
		'Come prepared to explain how you felt the day Samantha was born.', TRUE);
	insert into ScheduledFor values(
		(select max(AppointmentID) from Appointment),
		(select PersonID from Person where FirstName='Samantha' and LastName='Murchison'),
		null, TRUE);

insert into Appointment(AppointmentTime, Duration, CounselorID, EmployeeID, RoomNumber)
	values('2024-10-01 10:00', 60,
		(select PersonID from Person where FirstName='Quinn' and LastName='Fowler'),
		(select PersonID from Person where FirstName='John' and LastName='Taylor'),
		2);
	insert into ScheduledFor values(
		(select max(AppointmentID) from Appointment),
		(select PersonID from Person where FirstName='Leola' and LastName='White'),
		null, TRUE);

insert into Appointment(AppointmentTime, Duration, CounselorID, EmployeeID, RoomNumber)
	values('2024-10-01 10:00', 60,
		(select PersonID from Person where FirstName='Elizabeth' and LastName='Baker'),
		(select PersonID from Person where FirstName='Holly' and LastName='White'),
		3);
	insert into ScheduledFor values(
		(select max(AppointmentID) from Appointment),
		(select PersonID from Person where FirstName='Shannon' and LastName='Fake'),
		null, TRUE);

insert into Appointment(AppointmentTime, Duration, CounselorID, EmployeeID, RoomNumber)
	values('2024-10-01 10:00', 90,
		(select PersonID from Person where FirstName='Darold' and LastName='Cooper'),
		(select PersonID from Person where FirstName='Holly' and LastName='White'),
		4);
	insert into ScheduledFor values(
		(select max(AppointmentID) from Appointment),
		(select PersonID from Person where FirstName='Bernice' and LastName='Mason'),
		null, TRUE);

insert into Appointment(AppointmentTime, Duration, CounselorID, EmployeeID, RoomNumber)
	values('2024-10-08 10:00', 60,
		(select PersonID from Person where FirstName='Elizabeth' and LastName='Baker'),
		(select PersonID from Person where FirstName='Holly' and LastName='White'),
		3);
	insert into ScheduledFor values(
		(select max(AppointmentID) from Appointment),
		(select PersonID from Person where FirstName='Shannon' and LastName='Fake'),
		null, TRUE);

insert into Appointment(AppointmentTime, Duration, CounselorID, EmployeeID, RoomNumber)
	values('2024-10-08 10:00', 60,
		(select PersonID from Person where FirstName='Quinn' and LastName='Fowler'),
		(select PersonID from Person where FirstName='Holly' and LastName='White'),
		2);
	insert into ScheduledFor values(
		(select max(AppointmentID) from Appointment),
		(select PersonID from Person where FirstName='Leola' and LastName='White'),
		null, TRUE);

insert into Appointment(AppointmentTime, Duration, CounselorID, EmployeeID, RoomNumber)
	values('2024-10-08 10:00', 90,
		(select PersonID from Person where FirstName='Darold' and LastName='Cooper'),
		(select PersonID from Person where FirstName='Holly' and LastName='White'),
		4);
	insert into ScheduledFor values(
		(select max(AppointmentID) from Appointment),
		(select PersonID from Person where FirstName='Bernice' and LastName='Mason'),
		null, TRUE);


/* show data */
select * from Person;
select * from Counselor;
select * from Client;
select * from Employee;
select * from Family_Member;
select * from Family;
select * from Member_In_Family;
select * from Role;
select * from Member_Role;
select * from Room;
select * from Appointment;
select * from ScheduledFor;

/* who plays which roles in which family */
select p.FirstName, p.LastName, f.FamilyName, m.DateJoined, string_agg(r.RoleName, ', ' order by r.RoleName) as Roles
from Member_In_Family m
	join Person p on p.PersonID = m.MemberID
	join Family f on f.FamilyID = m.FamilyID
	join Member_Role mr on mr.FamilyID = m.FamilyID and mr.MemberID = m.MemberID
	join Role r on r.RoleID = mr.RoleID
group by p.FirstName, p.LastName, f.FamilyName, m.DateJoined
order by f.FamilyName, m.DateJoined, p.LastName;